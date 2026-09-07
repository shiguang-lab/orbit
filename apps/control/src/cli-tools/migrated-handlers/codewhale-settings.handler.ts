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

const TOOL_ID = "codewhale";

/**
 * CodeWhale is the actively-maintained successor to DeepSeek TUI (same
 * author, renamed project — https://github.com/Hmbown/CodeWhale). It reads
 * its config from ~/.codewhale/config.toml. Users upgrading from the old
 * DeepSeek TUI binary may still have ~/.deepseek/config.toml around, so we
 * read/write that path as a legacy fallback.
 */
const getPrimaryConfigPath = (): string =>
  getCliPrimaryConfigPath(TOOL_ID) ?? path.join(process.env.HOME ?? "~", ".codewhale", "config.toml");

const getLegacyConfigPath = (): string =>
  path.join(process.env.HOME ?? "~", ".deepseek", "config.toml");

const getPrimaryConfigDir = () => path.dirname(getPrimaryConfigPath());

/**
 * Render the ShiguangGateway config block in CodeWhale TOML format.
 * CodeWhale reads OPENAI_BASE_URL and OPENAI_API_KEY from its config.
 * Reference: https://github.com/Hmbown/CodeWhale
 */
function renderCodewhaleConfig(baseUrl: string, apiKey: string, model: string): string {
  return [
    "# CodeWhale config — managed by ShiguangGateway (plan 14)",
    "",
    "[openai]",
    `base_url = "${baseUrl}"`,
    `api_key = "${apiKey}"`,
    `model = "${model}"`,
    "",
  ].join("\n");
}

/**
 * Check if the config file contains ShiguangGateway settings.
 */
const hasShiguangGatewayConfig = (content: string | null): boolean => {
  if (!content) return false;
  return content.includes("managed by ShiguangGateway");
};

// Read current config.toml — prefers the primary ~/.codewhale path, falling
// back to the legacy ~/.deepseek path for users upgrading from DeepSeek TUI.
const readConfig = async (): Promise<string | null> => {
  for (const candidate of [getPrimaryConfigPath(), getLegacyConfigPath()]) {
    try {
      return await fs.readFile(candidate, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return null;
};

// GET — check CodeWhale CLI and return current config
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
            ? "CodeWhale is installed but not runnable"
            : "CodeWhale is not installed",
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
      configPath: getPrimaryConfigPath(),
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// POST — write ShiguangGateway settings to CodeWhale's config.toml (primary), and
// keep the legacy ~/.deepseek/config.toml in sync when it already exists so
// users who have not yet upgraded their CLI binary keep working.
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

    const primaryPath = getPrimaryConfigPath();
    const legacyPath = getLegacyConfigPath();
    const content = renderCodewhaleConfig(baseUrl, apiKey, model);

    // Always write the primary (~/.codewhale) config.
    await fs.mkdir(getPrimaryConfigDir(), { recursive: true });
    await createBackup(TOOL_ID, primaryPath);
    await fs.writeFile(primaryPath, content, "utf-8");

    // Best-effort: keep the legacy (~/.deepseek) config in sync only if it
    // already exists — never create a fresh legacy directory for new users.
    try {
      await fs.access(legacyPath);
      await createBackup(TOOL_ID, legacyPath);
      await fs.writeFile(legacyPath, content, "utf-8");
    } catch {
      /* legacy config not present — nothing to sync */
    }

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "CodeWhale settings applied successfully!",
      configPath: primaryPath,
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// DELETE — remove ShiguangGateway CodeWhale config (primary + legacy, if present)
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const primaryPath = getPrimaryConfigPath();
    const legacyPath = getLegacyConfigPath();

    // Backup + remove primary before removing
    await createBackup(TOOL_ID, primaryPath);
    await fs.rm(primaryPath, { force: true });

    // Best-effort: remove legacy config too, if present
    try {
      await fs.access(legacyPath);
      await createBackup(TOOL_ID, legacyPath);
      await fs.rm(legacyPath, { force: true });
    } catch {
      /* legacy config not present */
    }

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "CodeWhale settings removed successfully",
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}
