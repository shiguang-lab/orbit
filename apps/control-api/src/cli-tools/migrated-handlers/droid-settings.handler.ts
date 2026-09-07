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
import { cliMultiModelConfigSchema } from "@shiguang-gateway/core-domain/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { resolveApiKey } from "@shiguang-gateway/core-domain/shared/api-key-resolver";
import { readJsoncConfig } from "./_lib/jsoncConfig.js";
import { errorCode, parseJsonObject, type JsonObject } from "./_lib/jsonObject.js";
import {
  buildDroidCustomModels,
  isShiguangGatewayCustomModel,
  normalizeDroidModelList,
} from "./droid-settings/custom-models.js";

const getDroidSettingsPath = (): string => {
  const settingsPath = getCliPrimaryConfigPath("droid");
  if (!settingsPath) throw new Error("Factory Droid config path is unavailable");
  return settingsPath;
};
const getDroidDir = () => path.dirname(getDroidSettingsPath());

// Read current settings.json.
// Ported from upstream decolua/9router@6c10edf8: tolerate JSONC (trailing
// commas) and return null on any parse error so the dashboard renders
// "installed but not configured" instead of a 500 misread as "not installed".
const readSettings = async () => readJsoncConfig(getDroidSettingsPath());

// Check if settings has ShiguangGateway customModels.
// Multi-model entries are stored as `custom:ShiguangGateway-0`, `custom:ShiguangGateway-1`, …
// (Ported from upstream PR decolua/9router#618.)
const hasShiguangGatewayConfig = (settings: any) => {
  if (!settings || !settings.customModels) return false;
  return settings.customModels.some(isShiguangGatewayCustomModel);
};

// GET - Check droid CLI and read current settings
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const runtime = await getCliRuntimeStatus("droid");

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
            ? "Factory Droid CLI is installed but not runnable"
            : "Factory Droid CLI is not installed",
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
      settingsPath: getDroidSettingsPath(),
    });
  } catch (error) {
    console.log("Error checking droid settings:", error);
    return Response.json({ error: "Failed to check droid settings" }, { status: 500 });
  }
}

// POST - Update ShiguangGateway customModels (merge with existing settings)
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

    // (#549) Extract keyId BEFORE validation — Zod strips unknown fields!
    const keyId = typeof rawBody?.keyId === "string" ? rawBody.keyId.trim() : null;

    const validation = validateBody(cliMultiModelConfigSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { baseUrl, model, models, activeModel } = validation.data;
    const apiKey = await resolveApiKey(keyId, validation.data.apiKey);

    // Multi-model support (ported from decolua/9router#618): accept either a
    // `models` array or the legacy single `model` string.
    const modelList = normalizeDroidModelList({ model, models });
    if (modelList.length === 0) {
      return Response.json(
        {
          error: {
            message: "Invalid request",
            details: [
              { field: "models", message: "baseUrl and at least one model are required" },
            ],
          },
        },
        { status: 400 }
      );
    }

    const droidDir = getDroidDir();
    const settingsPath = getDroidSettingsPath();

    // Ensure directory exists
    await fs.mkdir(droidDir, { recursive: true });

    // Backup current settings before modifying
    await createBackup("droid", settingsPath);

    // Read existing settings or create new
    let settings: JsonObject = {};
    try {
      const existingSettings = await fs.readFile(settingsPath, "utf-8");
      settings = parseJsonObject(existingSettings);
    } catch {
      /* No existing settings */
    }

    // Ensure customModels array exists
    // Remove every existing ShiguangGateway config (multi-model: index 0..N)
    const currentCustomModels: unknown[] = Array.isArray(settings.customModels)
      ? settings.customModels
      : [];
    const retainedCustomModels = currentCustomModels.filter(
      (model) =>
        typeof model !== "object" || model === null || !isShiguangGatewayCustomModel(model)
    );

    // Normalize baseUrl to ensure /v1 suffix
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

    // Build and prepend ShiguangGateway entries (one per requested model)
    const newEntries = buildDroidCustomModels(modelList, {
      baseUrl: normalizedBaseUrl,
      apiKey: apiKey || "your_api_key",
      activeModel,
    });
    settings.customModels = [...newEntries, ...retainedCustomModels];

    // Write settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured("droid");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Factory Droid settings applied successfully!",
      settingsPath,
    });
  } catch (error) {
    console.log("Error updating droid settings:", error);
    return Response.json({ error: "Failed to update droid settings" }, { status: 500 });
  }
}

// DELETE - Remove ShiguangGateway customModels only (keep other settings)
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const settingsPath = getDroidSettingsPath();

    // Backup current settings before resetting
    await createBackup("droid", settingsPath);

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

    // Remove ShiguangGateway customModels (every index, multi-model)
    if (Array.isArray(settings.customModels)) {
      const retainedCustomModels = settings.customModels.filter(
        (model) =>
          typeof model !== "object" || model === null || !isShiguangGatewayCustomModel(model)
      );
      settings.customModels = retainedCustomModels;

      // Remove customModels array if empty
      if (retainedCustomModels.length === 0) {
        delete settings.customModels;
      }
    }

    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured("droid");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "ShiguangGateway settings removed successfully",
    });
  } catch (error) {
    console.log("Error resetting droid settings:", error);
    return Response.json({ error: "Failed to reset droid settings" }, { status: 500 });
  }
}
