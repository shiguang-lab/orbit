"use server";

import fs from "fs/promises";
import path from "path";
import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  ensureCliConfigWriteAllowed,
  getCliPrimaryConfigPath,
  getCliRuntimeStatus,
} from "@shiguang-gateway/core-domain/control/cli-tools-runtime";
import { createBackup } from "@shiguang-gateway/core-domain/control/cli-tools-backups";
import { normalizeClaudeBaseUrl } from "../claude-cli-config.js";
import { saveCliToolLastConfigured, deleteCliToolLastConfigured } from "../cli-tool-state.js";
import { cliSettingsEnvSchema } from "@shiguang-gateway/core-domain/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { getApiKeyById } from "@shiguang-gateway/core-domain/db/api-keys";
import { readJsoncConfig } from "./_lib/jsoncConfig.js";

// Get claude settings path based on OS
const getClaudeSettingsPath = () => getCliPrimaryConfigPath("claude");

// Read current settings.
// Ported from upstream decolua/9router@6c10edf8: tolerate JSONC (trailing
// commas) and return null on any parse error so the dashboard renders
// "installed but not configured" instead of a 500 misread as "not installed".
const readSettings = async () => {
  const settingsPath = getClaudeSettingsPath();
  return readJsoncConfig(settingsPath);
};

// GET - Check claude CLI and read current settings
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const runtime = await getCliRuntimeStatus("claude");

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
            ? "Claude CLI is installed but not runnable"
            : "Claude CLI is not installed",
      });
    }

    const settings = await readSettings();
    const hasShiguangGateway = !!settings?.env?.ANTHROPIC_BASE_URL;

    return Response.json({
      installed: runtime.installed,
      runnable: runtime.runnable,
      command: runtime.command,
      commandPath: runtime.commandPath,
      runtimeMode: runtime.runtimeMode,
      reason: runtime.reason,
      settings: settings,
      hasShiguangGateway: hasShiguangGateway,
      settingsPath: getClaudeSettingsPath(),
    });
  } catch (error) {
    console.log("Error checking claude settings:", error);
    return Response.json({ error: "Failed to check claude settings" }, { status: 500 });
  }
}

// POST - Backup old fields and write new settings
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

    // (#523/#526) Extract keyId BEFORE validation — Zod strips unknown fields!
    // The /api/keys list endpoint returns masked key strings — sending those to
    // disk would save an unusable half-hidden token. Resolving by ID guarantees
    // we always write the full key value to the config file.
    const keyId = typeof rawBody?.keyId === "string" ? rawBody.keyId.trim() : null;

    const validation = validateBody(cliSettingsEnvSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { env } = validation.data;

    // Resolve the real API key from DB by ID
    if (keyId) {
      try {
        const keyRecord = await getApiKeyById(keyId);
        if (keyRecord?.key) {
          env.ANTHROPIC_AUTH_TOKEN = keyRecord.key as string;
        }
      } catch {
        // Non-critical: fall back to whatever value was already provided in env.
      }
    }

    const settingsPath = getClaudeSettingsPath();
    const claudeDir = path.dirname(settingsPath);

    // Ensure .claude directory exists
    await fs.mkdir(claudeDir, { recursive: true });

    // Backup current settings before modifying
    await createBackup("claude", settingsPath);

    // Read current settings
    let currentSettings: Record<string, any> = {};
    try {
      const content = await fs.readFile(settingsPath, "utf-8");
      currentSettings = JSON.parse(content);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    // Claude Code gateway mode expects the unified root endpoint, not a forced /v1 suffix.
    if (env.ANTHROPIC_BASE_URL) {
      env.ANTHROPIC_BASE_URL = normalizeClaudeBaseUrl(env.ANTHROPIC_BASE_URL);
    }

    // Merge new env with existing settings
    const newSettings = {
      ...currentSettings,
      env: {
        ...(currentSettings.env || {}),
        ...env,
      },
    };

    // Write new settings
    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured("claude");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.log("Error updating claude settings:", error);
    return Response.json({ error: "Failed to update claude settings" }, { status: 500 });
  }
}

// Fields to remove when resetting
const RESET_ENV_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "API_TIMEOUT_MS",
];

// DELETE - Reset settings (remove env fields)
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const settingsPath = getClaudeSettingsPath();

    // Read current settings
    let currentSettings: Record<string, any> = {};
    try {
      const content = await fs.readFile(settingsPath, "utf-8");
      currentSettings = JSON.parse(content);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return Response.json({
          success: true,
          message: "No settings file to reset",
        });
      }
      throw error;
    }

    // Backup current settings before resetting
    await createBackup("claude", settingsPath);

    // Remove specified env fields
    if (currentSettings.env) {
      RESET_ENV_KEYS.forEach((key) => {
        delete currentSettings.env[key];
      });

      // Clean up empty env object
      if (Object.keys(currentSettings.env).length === 0) {
        delete currentSettings.env;
      }
    }

    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured("claude");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Settings reset successfully",
    });
  } catch (error) {
    console.log("Error resetting claude settings:", error);
    return Response.json({ error: "Failed to reset claude settings" }, { status: 500 });
  }
}
