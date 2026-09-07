import fs from "fs/promises";
import path from "path";
import { requireManagementAuth as requireCliToolsAuth } from "@orbit/core/control/management-auth";
import {
  ensureCliConfigWriteAllowed,
  getCliPrimaryConfigPath,
  getCliRuntimeStatus,
} from "@orbit/core/cli/runtime";
import { createBackup } from "@orbit/core/cli/backups";
import { saveCliToolLastConfigured, deleteCliToolLastConfigured } from "../cli-tool-state.js";
import { cliModelConfigSchema } from "@orbit/core/control/cli-tools-config-validation";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { resolveApiKey } from "@orbit/core/shared/api-key-resolver";
import { sanitizeErrorMessage } from "@orbit/utils/errors";

const TOOL_ID = "pi";

const getPiConfigPath = (): string =>
  getCliPrimaryConfigPath(TOOL_ID) ?? path.join(process.env.HOME ?? "~", ".pi", "config.json");

const getPiDir = () => path.dirname(getPiConfigPath());

/**
 * Check if the config file contains ShiguangGateway settings.
 */
const hasShiguangGatewayConfig = (settings: Record<string, unknown> | null): boolean => {
  if (!settings) return false;
  return (
    typeof settings.baseUrl === "string" &&
    settings.baseUrl.length > 0 &&
    settings._managedBy === "shiguangGateway"
  );
};

// Read current config.json
const readConfig = async (): Promise<Record<string, unknown> | null> => {
  try {
    const content = await fs.readFile(getPiConfigPath(), "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
};

// GET — check pi CLI and return current config
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const runtime = await getCliRuntimeStatus(TOOL_ID);

    if (!runtime.installed || !runtime.runnable) {
      return Response.json({
        installed: runtime.installed,
        runnable: runtime.runnable,
        command: runtime.command,
        commandPath: runtime.commandPath,
        runtimeMode: runtime.runtimeMode,
        reason: runtime.reason,
        config: null,
        message:
          runtime.installed && !runtime.runnable
            ? "Pi CLI is installed but not runnable"
            : "Pi CLI is not installed",
      });
    }

    const config = await readConfig();

    return Response.json({
      installed: runtime.installed,
      runnable: runtime.runnable,
      command: runtime.command,
      commandPath: runtime.commandPath,
      runtimeMode: runtime.runtimeMode,
      reason: runtime.reason,
      config,
      hasShiguangGateway: hasShiguangGatewayConfig(config),
      configPath: getPiConfigPath(),
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// POST — write ShiguangGateway settings to Pi config.json
export async function POST(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    // Extract keyId BEFORE Zod validation — Zod strips unknown fields
    const keyId = typeof rawBody?.keyId === "string" ? rawBody.keyId.trim() : null;

    const validation = validateBody(cliModelConfigSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { baseUrl, model } = validation.data;
    const apiKey = await resolveApiKey(keyId, validation.data.apiKey);

    const configPath = getPiConfigPath();
    const piDir = getPiDir();

    // Ensure directory exists
    await fs.mkdir(piDir, { recursive: true });

    // Backup current config before modifying
    await createBackup(TOOL_ID, configPath);

    // Read existing config or start fresh
    let existing: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* No existing config */
    }

    // Merge ShiguangGateway settings (pi uses OpenAI-compatible config)
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const updated: Record<string, unknown> = {
      ...existing,
      baseUrl: normalizedBaseUrl,
      apiKey,
      model,
      _managedBy: "shiguangGateway",
    };

    await fs.writeFile(configPath, JSON.stringify(updated, null, 2), "utf-8");

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "Pi settings applied successfully!",
      configPath,
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// DELETE — remove ShiguangGateway settings from Pi config
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const configPath = getPiConfigPath();

    // Backup before modifying
    await createBackup(TOOL_ID, configPath);

    // Read existing config
    let existing: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return Response.json({ success: true, message: "No config file to reset" });
      }
      throw err;
    }

    // Remove ShiguangGateway-managed fields
    delete existing.baseUrl;
    delete existing.apiKey;
    delete existing.model;
    delete existing._managedBy;

    if (Object.keys(existing).length === 0) {
      await fs.rm(configPath, { force: true });
    } else {
      await fs.writeFile(configPath, JSON.stringify(existing, null, 2), "utf-8");
    }

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({ success: true, message: "Pi ShiguangGateway settings removed" });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}
