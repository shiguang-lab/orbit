"use server";

import fs from "fs/promises";
import path from "path";
import os from "os";
import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { ensureCliConfigWriteAllowed, getCliRuntimeStatus } from "@shiguang-gateway/core-domain/cli/runtime";
import { createBackup } from "@shiguang-gateway/core-domain/cli/backups";
import { saveCliToolLastConfigured, deleteCliToolLastConfigured } from "../cli-tool-state.js";
import { cliModelConfigSchema } from "@shiguang-gateway/core-domain/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { resolveApiKey } from "@shiguang-gateway/core-domain/shared/api-key-resolver";
import { readJsoncConfig } from "./_lib/jsoncConfig.js";
import type { JsonObject } from "./_lib/jsonObject.js";

const CLINE_DATA_DIR = path.join(os.homedir(), ".cline", "data");
const GLOBAL_STATE_PATH = path.join(CLINE_DATA_DIR, "globalState.json");
const SECRETS_PATH = path.join(CLINE_DATA_DIR, "secrets.json");

// Read globalState.json.
// Ported from upstream decolua/9router@6c10edf8: tolerate JSONC (trailing
// commas) and return null on any parse error so the dashboard renders
// "installed but not configured" instead of a 500 misread as "not installed".
const readGlobalState = async () => readJsoncConfig<JsonObject>(GLOBAL_STATE_PATH);

// Read secrets.json (same JSONC-tolerant behaviour; defaults to {} for compat).
const readSecrets = async () => readJsoncConfig<Record<string, unknown>>(SECRETS_PATH, {});

// Check if ShiguangGateway is configured as OpenAI-compatible provider
const hasShiguangGatewayConfig = (globalState: any) => {
  if (!globalState) return false;
  const isOpenAi =
    globalState.actModeApiProvider === "openai" || globalState.planModeApiProvider === "openai";
  const baseUrl = globalState.openAiBaseUrl || "";
  return (
    isOpenAi &&
    (baseUrl.includes("localhost") ||
      baseUrl.includes("127.0.0.1") ||
      baseUrl.includes("shiguangGateway"))
  );
};

// GET - Check cline CLI and read current settings
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const runtime = await getCliRuntimeStatus("cline");

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
            ? "Cline CLI is installed but not runnable"
            : "Cline CLI is not installed",
      });
    }

    const globalState = await readGlobalState();
    const secrets = await readSecrets();

    return Response.json({
      installed: runtime.installed,
      runnable: runtime.runnable,
      command: runtime.command,
      commandPath: runtime.commandPath,
      runtimeMode: runtime.runtimeMode,
      reason: runtime.reason,
      settings: {
        actModeApiProvider: globalState?.actModeApiProvider,
        planModeApiProvider: globalState?.planModeApiProvider,
        openAiBaseUrl: globalState?.openAiBaseUrl,
        openAiModelId: globalState?.openAiModelId,
        planModeOpenAiModelId: globalState?.planModeOpenAiModelId,
      },
      hasShiguangGateway: hasShiguangGatewayConfig(globalState),
      globalStatePath: GLOBAL_STATE_PATH,
      secretsPath: SECRETS_PATH,
    });
  } catch (error) {
    console.log("Error checking cline settings:", error);
    return Response.json({ error: "Failed to check cline settings" }, { status: 500 });
  }
}

// POST - Configure Cline to use ShiguangGateway as OpenAI-compatible provider
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
    const { baseUrl, model } = validation.data;
    const apiKey = await resolveApiKey(keyId, validation.data.apiKey);

    // Ensure directory exists
    await fs.mkdir(CLINE_DATA_DIR, { recursive: true });

    // Backup current files before modifying
    await createBackup("cline", GLOBAL_STATE_PATH);
    await createBackup("cline", SECRETS_PATH);

    // Read existing globalState or create new
    let globalState: Record<string, any> = {};
    try {
      const existing = await fs.readFile(GLOBAL_STATE_PATH, "utf-8");
      globalState = JSON.parse(existing);
    } catch {
      /* No existing config */
    }

    // Normalize baseUrl - Cline expects the base without /v1
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl.slice(0, -3) : baseUrl;

    // Set OpenAI-compatible provider for both act and plan modes
    globalState.actModeApiProvider = "openai";
    globalState.planModeApiProvider = "openai";
    globalState.openAiBaseUrl = normalizedBaseUrl;
    globalState.openAiModelId = model;
    globalState.planModeOpenAiModelId = model;

    // Write globalState
    await fs.writeFile(GLOBAL_STATE_PATH, JSON.stringify(globalState, null, 2));

    // Write API key to secrets
    let secrets: Record<string, any> = {};
    try {
      const existing = await fs.readFile(SECRETS_PATH, "utf-8");
      secrets = JSON.parse(existing);
    } catch {
      /* No existing secrets */
    }

    secrets.openAiApiKey = apiKey || "sk_shiguangGateway";

    await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2));

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured("cline");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Cline settings applied successfully!",
      globalStatePath: GLOBAL_STATE_PATH,
    });
  } catch (error) {
    console.log("Error updating cline settings:", error);
    return Response.json({ error: "Failed to update cline settings" }, { status: 500 });
  }
}

// DELETE - Remove ShiguangGateway OpenAI-compatible provider config
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    // Backup before reset
    await createBackup("cline", GLOBAL_STATE_PATH);
    await createBackup("cline", SECRETS_PATH);

    // Read existing state
    let globalState: Record<string, any> = {};
    try {
      const existing = await fs.readFile(GLOBAL_STATE_PATH, "utf-8");
      globalState = JSON.parse(existing);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return Response.json({ success: true, message: "No settings file to reset" });
      }
      throw error;
    }

    // Only reset if currently set to openai mode with our config
    if (globalState.actModeApiProvider === "openai") {
      delete globalState.openAiBaseUrl;
      delete globalState.openAiModelId;
      delete globalState.planModeOpenAiModelId;
      // Reset provider to default (cline)
      globalState.actModeApiProvider = "cline";
      globalState.planModeApiProvider = "cline";
    }

    await fs.writeFile(GLOBAL_STATE_PATH, JSON.stringify(globalState, null, 2));

    // Remove API key from secrets
    let secrets: Record<string, any> = {};
    try {
      const existing = await fs.readFile(SECRETS_PATH, "utf-8");
      secrets = JSON.parse(existing);
    } catch {
      /* ignore */
    }

    delete secrets.openAiApiKey;
    await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2));

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured("cline");
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "ShiguangGateway settings removed from Cline",
    });
  } catch (error) {
    console.log("Error resetting cline settings:", error);
    return Response.json({ error: "Failed to reset cline settings" }, { status: 500 });
  }
}
