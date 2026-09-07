"use server";

import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";

import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

import { requireManagementAuth as requireCliToolsAuth } from "@orbit/core/control/management-auth";
import { getApiKeyById } from "@orbit/core/db/api-keys";
import { deleteCliToolLastConfigured, saveCliToolLastConfigured } from "../cli-tool-state.js";
import { createMultiBackup } from "@orbit/core/cli/backups";
import {
  hasOrbitQwenCodeConfig,
  mergeQwenCodeEnv,
  mergeQwenCodeSettings,
  removeQwenCodeEnv,
  removeQwenCodeSettings,
} from "@orbit/core/shared/services/qwenCodeConfig";
import {
  ensureCliConfigWriteAllowed,
  getCliConfigPaths,
  getCliRuntimeStatus,
} from "@orbit/core/cli/runtime";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { cliModelConfigSchema } from "@orbit/core/control/cli-tools-validation-schemas";

const logger = pino({ name: "qwen-code-settings-api" });

const getPaths = (): { settings: string; env: string } => {
  const paths = getCliConfigPaths("qwen");
  if (!paths?.settings || !paths.env) throw new Error("Qwen Code config paths are unavailable");
  return { settings: paths.settings, env: paths.env };
};

const readTextIfPresent = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readSettings = async (filePath: string): Promise<Record<string, unknown>> => {
  const text = await readTextIfPresent(filePath);
  if (!text.trim()) return {};

  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Qwen Code settings.json must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
};

const writeAtomic = async (filePath: string, content: string, mode?: number): Promise<void> => {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, content, { encoding: "utf8", mode });
    if (mode !== undefined) await fs.chmod(tempPath, mode);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
};

export async function GET(request: Request): Promise<Response> {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const configPaths = getPaths();
    const [runtime, settings] = await Promise.all([
      getCliRuntimeStatus("qwen"),
      readSettings(configPaths.settings),
    ]);

    return Response.json({
      ...runtime,
      settings,
      hasOrbit: hasOrbitQwenCodeConfig(settings),
      settingsPath: configPaths.settings,
      envPath: configPaths.env,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to read Qwen Code settings");
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
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

  const validation = validateBody(cliModelConfigSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const writeGuard = ensureCliConfigWriteAllowed();
  if (writeGuard) return Response.json({ error: writeGuard }, { status: 403 });

  try {
    const configPaths = getPaths();
    const bodyRecord = rawBody as Record<string, unknown>;
    const keyId = typeof bodyRecord.keyId === "string" ? bodyRecord.keyId.trim() : "";
    let apiKey = validation.data.apiKey || "";
    if (keyId) {
      const keyRecord = await getApiKeyById(keyId);
      if (keyRecord?.key) apiKey = keyRecord.key;
    }
    if (!apiKey) apiKey = "sk_orbit";

    const [existingSettings, existingEnv] = await Promise.all([
      readSettings(configPaths.settings),
      readTextIfPresent(configPaths.env),
    ]);
    const nextSettings = mergeQwenCodeSettings(existingSettings, {
      baseUrl: validation.data.baseUrl,
      model: validation.data.model,
    });
    const nextEnv = mergeQwenCodeEnv(existingEnv, apiKey);

    await fs.mkdir(path.dirname(configPaths.settings), { recursive: true, mode: 0o700 });
    await createMultiBackup("qwen", [configPaths.settings, configPaths.env]);
    await writeAtomic(configPaths.settings, `${JSON.stringify(nextSettings, null, 2)}\n`);
    await writeAtomic(configPaths.env, nextEnv, 0o600);

    try {
      saveCliToolLastConfigured("qwen");
    } catch (error) {
      logger.warn({ err: error }, "Failed to save Qwen Code configuration timestamp");
    }

    return Response.json({
      success: true,
      message: "Qwen Code now routes through Orbit",
      settingsPath: configPaths.settings,
      envPath: configPaths.env,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to update Qwen Code settings");
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  const writeGuard = ensureCliConfigWriteAllowed();
  if (writeGuard) return Response.json({ error: writeGuard }, { status: 403 });

  try {
    const configPaths = getPaths();
    const [settingsExists, envExists, existingSettings, existingEnv] = await Promise.all([
      fileExists(configPaths.settings),
      fileExists(configPaths.env),
      readSettings(configPaths.settings),
      readTextIfPresent(configPaths.env),
    ]);
    const nextSettings = removeQwenCodeSettings(existingSettings);
    const nextEnv = removeQwenCodeEnv(existingEnv);

    if (settingsExists || envExists) {
      await createMultiBackup("qwen", [configPaths.settings, configPaths.env]);
      if (settingsExists) {
        await writeAtomic(configPaths.settings, `${JSON.stringify(nextSettings, null, 2)}\n`);
      }
      if (envExists) await writeAtomic(configPaths.env, nextEnv, 0o600);
    }

    try {
      deleteCliToolLastConfigured("qwen");
    } catch (error) {
      logger.warn({ err: error }, "Failed to clear Qwen Code configuration timestamp");
    }

    return Response.json({
      success: true,
      message: "Orbit settings removed from Qwen Code",
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to reset Qwen Code settings");
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
