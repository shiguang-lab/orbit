"use server";

import fs from "fs/promises";
import path from "path";
import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  ensureCliConfigWriteAllowed,
  getCliPrimaryConfigPath,
  getCliRuntimeStatus,
} from "@shiguang-gateway/core-domain/cli/runtime";
import { createBackup } from "@shiguang-gateway/core-domain/cli/backups";
import { saveCliToolLastConfigured, deleteCliToolLastConfigured } from "../cli-tool-state.js";
import { cliModelConfigSchema } from "@shiguang-gateway/core-domain/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { resolveApiKey } from "@shiguang-gateway/core-domain/shared/api-key-resolver";
import { readJsoncConfig } from "./_lib/jsoncConfig.js";
import { errorCode, isJsonObject, parseJsonObject, type JsonObject } from "./_lib/jsonObject.js";

const getOpenClawSettingsPath = (): string => {
  const settingsPath = getCliPrimaryConfigPath("openclaw");
  if (!settingsPath) throw new Error("OpenClaw config path is unavailable");
  return settingsPath;
};
const getOpenClawDir = () => path.dirname(getOpenClawSettingsPath());

// Read current settings.json.
// Ported from upstream decolua/9router@6c10edf8: tolerate JSONC (trailing
// commas) and return null on any parse error so the dashboard renders
// "installed but not configured" instead of a 500 misread as "not installed".
const readSettings = async () => readJsoncConfig<JsonObject>(getOpenClawSettingsPath());

// Check if settings has ShiguangGateway config
const hasShiguangGatewayConfig = (settings: JsonObject | null) => {
  if (!isJsonObject(settings?.models)) return false;
  if (!isJsonObject(settings.models.providers)) return false;
  return !!settings.models.providers.shiguangGateway;
};

// GET - Check openclaw CLI and read current settings
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const runtime = await getCliRuntimeStatus("openclaw");

    if (!runtime.installed || !runtime.runnable) {
      return Response.json({
        installed: runtime.installed,
        runnable: runtime.runnable,
        command: runtime.command,
        commandPath: runtime.commandPath,
        runtimeMode: runtime.runtimeMode,
        reason: runtime.reason,
        settings: null,
        message:
          runtime.installed && !runtime.runnable
            ? "Open Claw CLI is installed but not runnable"
            : "Open Claw CLI is not installed",
      });
    }

    const settings = await readSettings();

    return Response.json({
      installed: runtime.installed,
      runnable: runtime.runnable,
      command: runtime.command,
      commandPath: runtime.commandPath,
      runtimeMode: runtime.runtimeMode,
      reason: runtime.reason,
      settings,
      hasShiguangGateway: hasShiguangGatewayConfig(settings),
      settingsPath: getOpenClawSettingsPath(),
    });
  } catch (error) {
    console.log("Error checking openclaw settings:", error);
    return Response.json({ error: "Failed to check openclaw settings" }, { status: 500 });
  }
}

// POST - Update ShiguangGateway settings (merge with existing settings)
export async function POST(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    // (#526) Extract keyId BEFORE validation — Zod strips unknown fields!
    const keyId = typeof rawBody?.keyId === "string" ? rawBody.keyId.trim() : null;

    const validation = validateBody(cliModelConfigSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    let { baseUrl, model } = validation.data;
    let apiKey = await resolveApiKey(keyId, validation.data.apiKey);

    const openclawDir = getOpenClawDir();
    const settingsPath = getOpenClawSettingsPath();

    // Ensure directory exists
    await fs.mkdir(openclawDir, { recursive: true });

    // Backup current settings before modifying
    await createBackup("openclaw", settingsPath);

    // Read existing settings or create new
    let settings: JsonObject = {};
    try {
      const existingSettings = await fs.readFile(settingsPath, "utf-8");
      settings = parseJsonObject(existingSettings);
    } catch {
      /* No existing settings */
    }

    // Ensure structure exists
    const agents = isJsonObject(settings.agents) ? settings.agents : {};
    settings.agents = agents;
    const defaults = isJsonObject(agents.defaults) ? agents.defaults : {};
    agents.defaults = defaults;
    const defaultModel = isJsonObject(defaults.model) ? defaults.model : {};
    defaults.model = defaultModel;
    const models = isJsonObject(settings.models) ? settings.models : {};
    settings.models = models;
    const providers = isJsonObject(models.providers) ? models.providers : {};
    models.providers = providers;

    // Normalize baseUrl to ensure /v1 suffix
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

    // Update agents.defaults.model.primary
    defaultModel.primary = `shiguangGateway/${model}`;

    // Update models.providers.shiguangGateway
    providers.shiguangGateway = {
      baseUrl: normalizedBaseUrl,
      apiKey: apiKey || "your_api_key",
      api: "openai-completions",
      models: [
        {
          id: model,
          name: model.split("/").pop() || model,
        },
      ],
    };

    // Write settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured("openclaw");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Open Claw settings applied successfully!",
      settingsPath,
    });
  } catch (error) {
    console.log("Error updating openclaw settings:", error);
    return Response.json({ error: "Failed to update openclaw settings" }, { status: 500 });
  }
}

// DELETE - Remove ShiguangGateway settings only (keep other settings)
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const settingsPath = getOpenClawSettingsPath();

    // Backup current settings before resetting
    await createBackup("openclaw", settingsPath);

    // Read existing settings
    let settings: JsonObject = {};
    try {
      const existingSettings = await fs.readFile(settingsPath, "utf-8");
      settings = parseJsonObject(existingSettings);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") {
        return Response.json({
          success: true,
          message: "No settings file to reset",
        });
      }
      throw error;
    }

    // Remove ShiguangGateway from models.providers
    const models = isJsonObject(settings.models) ? settings.models : null;
    const providers = isJsonObject(models?.providers) ? models.providers : null;
    if (models && providers) {
      delete providers.shiguangGateway;

      // Remove providers object if empty
      if (Object.keys(providers).length === 0) {
        delete models.providers;
      }
    }

    // Reset agents.defaults.model.primary if it uses shiguangGateway
    const agents = isJsonObject(settings.agents) ? settings.agents : null;
    const defaults = isJsonObject(agents?.defaults) ? agents.defaults : null;
    const defaultModel = isJsonObject(defaults?.model) ? defaults.model : null;
    if (typeof defaultModel?.primary === "string" && defaultModel.primary.startsWith("shiguangGateway/")) {
      delete defaultModel.primary;
    }

    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured("openclaw");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "ShiguangGateway settings removed successfully",
    });
  } catch (error) {
    console.log("Error resetting openclaw settings:", error);
    return Response.json({ error: "Failed to reset openclaw settings" }, { status: 500 });
  }
}
