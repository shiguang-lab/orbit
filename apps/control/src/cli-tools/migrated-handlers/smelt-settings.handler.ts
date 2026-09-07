"use server";

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
import { cliModelConfigSchema } from "@orbit/core/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { resolveApiKey } from "@orbit/core/shared/api-key-resolver";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

const TOOL_ID = "smelt";

const getSmeltConfigPath = (): string =>
  getCliPrimaryConfigPath(TOOL_ID) ?? path.join(process.env.HOME ?? "~", ".smelt", "config.json");

const getSmeltDir = () => path.dirname(getSmeltConfigPath());

/**
 * Check if the config file contains Orbit settings.
 */
const hasOrbitConfig = (settings: Record<string, unknown> | null): boolean => {
  if (!settings) return false;
  return (
    typeof settings.baseUrl === "string" &&
    settings.baseUrl.length > 0 &&
    settings._managedBy === "orbit"
  );
};

// Read current config.json
const readConfig = async (): Promise<Record<string, unknown> | null> => {
  try {
    const content = await fs.readFile(getSmeltConfigPath(), "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
};

// GET — check smelt CLI and return current config
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
            ? "Smelt CLI is installed but not runnable"
            : "Smelt CLI is not installed",
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
      hasOrbit: hasOrbitConfig(config),
      configPath: getSmeltConfigPath(),
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// POST — write Orbit settings to Smelt config.json
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

    const configPath = getSmeltConfigPath();
    const smeltDir = getSmeltDir();

    // Ensure directory exists
    await fs.mkdir(smeltDir, { recursive: true });

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

    // Merge Orbit settings (smelt uses OpenAI-compatible config)
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const updated: Record<string, unknown> = {
      ...existing,
      baseUrl: normalizedBaseUrl,
      apiKey,
      model,
      _managedBy: "orbit",
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
      message: "Smelt settings applied successfully!",
      configPath,
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// DELETE — remove Orbit settings from Smelt config
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const configPath = getSmeltConfigPath();

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

    // Remove Orbit-managed fields
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

    return Response.json({ success: true, message: "Smelt Orbit settings removed" });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}
