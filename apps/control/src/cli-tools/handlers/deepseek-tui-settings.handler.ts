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

const TOOL_ID = "deepseek-tui";

const getDeepseekTuiConfigPath = (): string =>
  getCliPrimaryConfigPath(TOOL_ID) ??
  path.join(process.env.HOME ?? "~", ".config", "deepseek-tui", "config.toml");

const getDeepseekTuiDir = () => path.dirname(getDeepseekTuiConfigPath());

/**
 * Render the Orbit config block in DeepSeek TUI TOML format.
 * DeepSeek TUI reads OPENAI_BASE_URL and OPENAI_API_KEY from its config.
 * Reference: https://github.com/hunterbown/deepseek-tui
 */
function renderDeepseekTuiConfig(baseUrl: string, apiKey: string, model: string): string {
  return [
    "# DeepSeek TUI config — managed by Orbit (plan 14)",
    "",
    "[openai]",
    `base_url = "${baseUrl}"`,
    `api_key = "${apiKey}"`,
    `model = "${model}"`,
    "",
  ].join("\n");
}

/**
 * Check if the config file contains Orbit settings.
 */
const hasOrbitConfig = (content: string | null): boolean => {
  if (!content) return false;
  return content.includes("managed by Orbit");
};

// Read current config.toml
const readConfig = async (): Promise<string | null> => {
  try {
    return await fs.readFile(getDeepseekTuiConfigPath(), "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
};

// GET — check deepseek-tui CLI and return current config
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
            ? "DeepSeek TUI is installed but not runnable"
            : "DeepSeek TUI is not installed",
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
      configPath: getDeepseekTuiConfigPath(),
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// POST — write Orbit settings to DeepSeek TUI config.toml
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

    const configPath = getDeepseekTuiConfigPath();
    const configDir = getDeepseekTuiDir();

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Backup current config before modifying
    await createBackup(TOOL_ID, configPath);

    // Write new config (full replace — simple TOML file)
    const content = renderDeepseekTuiConfig(baseUrl, apiKey, model);
    await fs.writeFile(configPath, content, "utf-8");

    // Persist last-configured timestamp
    try {
      saveCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "DeepSeek TUI settings applied successfully!",
      configPath,
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}

// DELETE — remove DeepSeek TUI Orbit config
export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) {
      return Response.json({ error: writeGuard }, { status: 403 });
    }

    const configPath = getDeepseekTuiConfigPath();

    // Backup before removing
    await createBackup(TOOL_ID, configPath);

    await fs.rm(configPath, { force: true });

    // Clear last-configured timestamp
    try {
      deleteCliToolLastConfigured(TOOL_ID);
    } catch {
      /* non-critical */
    }

    return Response.json({
      success: true,
      message: "DeepSeek TUI settings removed successfully",
    });
  } catch (err) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    );
  }
}
