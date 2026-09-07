import fs from "fs/promises";
import path from "path";
import os from "os";
import * as yaml from "js-yaml";
import { requireManagementAuth as requireCliToolsAuth } from "@orbit/core/control/management-auth";
import { getRuntimePorts } from "@orbit/core/control/cli-tools-runtime-ports";
import { getCliPrimaryConfigPath, getOpenCodeConfigPath } from "@orbit/core/cli/runtime";
import { guideSettingsSaveSchema } from "@orbit/core/control/cli-tools-validation-schemas";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { resolveApiKey, getOrCreateApiKey } from "@orbit/core/shared/api-key-resolver";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { guardCliConfigWrite } from "@orbit/core/control/cli-tools-config-guard";
import { mergeOpenCodeConfigText } from "./opencode-config.js";
import { isJsonObject, parseJsonObject, type JsonObject } from "../_lib/jsonObject.js";

type RouteContext = { params: Record<string, string> };
type BaseGuideConfig = { baseUrl?: string; apiKey?: string; model?: string };
type OpenCodeGuideConfig = BaseGuideConfig & {
  models?: string[];
  modelLabels?: Record<string, string>;
};

/**
 * Where each guide tool's config lands, and the host command that writes the
 * same thing when Orbit itself runs in a container.
 */
const GUIDE_TOOL_TARGETS: Record<string, { resolve: () => string; hostCommand: string }> = {
  continue: {
    resolve: () => path.join(os.homedir(), ".continue", "config.json"),
    hostCommand: "orbit setup-continue",
  },
  opencode: {
    resolve: () => getOpenCodeConfigPath(),
    hostCommand: "orbit setup-opencode",
  },
  hermes: {
    resolve: () =>
      getCliPrimaryConfigPath("hermes") || path.join(os.homedir(), ".hermes", "config.yaml"),
    hostCommand: "orbit config set hermes",
  },
};

/**
 * POST /api/cli-tools/guide-settings/:toolId
 *
 * Save configuration for guide-based tools that have config files.
 * Currently supports: continue, opencode
 */
export async function GET(request: Request, { params }: RouteContext) {
  // cli-tools routes require the shared management auth guard on every exported handler.
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;
  void params;
  return Response.json({ error: "GET not supported for this tool" }, { status: 400 });
}

export async function POST(request: Request, { params }: RouteContext) {
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

  const toolId = String(params.toolId ?? "").trim();
  const validation = validateBody(guideSettingsSaveSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { baseUrl, model, models, modelLabels } = validation.data;
  // (#523) Extract keyId BEFORE validation — Zod strips unknown fields!
  const apiKeyId = typeof rawBody?.keyId === "string" ? rawBody.keyId.trim() : null;
  // If no keyId provided, auto-create a valid DB-backed key instead of using placeholder
  const apiKey = apiKeyId
    ? await resolveApiKey(apiKeyId, validation.data.apiKey)
    : await getOrCreateApiKey();

  const target = GUIDE_TOOL_TARGETS[toolId];
  if (target) {
    const refusal = guardCliConfigWrite(target.resolve(), {
      toolLabel: toolId,
      hostCommand: target.hostCommand,
    });
    if (refusal) return refusal;
  }

  try {
    switch (toolId) {
      case "continue":
        return await saveContinueConfig({ baseUrl, apiKey, model });
      case "opencode":
        // (#524) OpenCode config was never saved because only 'continue' was handled here.
        // OpenCode reads opencode.jsonc/opencode.json — update the active native config.
        return await saveOpenCodeConfig({ baseUrl, apiKey, model, models, modelLabels });
      case "hermes":
        return await saveHermesConfig({ baseUrl, apiKey, model });
      // hermes-agent now uses the dedicated /api/cli-tools/hermes-agent-settings endpoint
      default:
        return Response.json(
          { error: `Direct config save not supported for: ${toolId}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

/**
 * Save Continue config to ~/.continue/config.json
 * Merges with existing config if present.
 */
async function saveContinueConfig({ baseUrl, apiKey, model }: BaseGuideConfig) {
  const { apiPort } = getRuntimePorts();
  const configPath = path.join(os.homedir(), ".continue", "config.json");
  const configDir = path.dirname(configPath);

  // Ensure dir exists
  await fs.mkdir(configDir, { recursive: true });

  // Read existing config if any
  let existingConfig: JsonObject = {};
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    existingConfig = parseJsonObject(raw);
  } catch {
    // No existing config or invalid JSON — start fresh
  }

  // Build the Orbit model entry
  const normalizedBaseUrl = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  const routerModel = {
    apiBase: normalizedBaseUrl,
    title: model,
    model: model,
    provider: "openai",
    apiKey: apiKey || "sk_orbit",
    orbitManaged: true,
  };

  // Merge into existing models array
  const models: unknown[] = Array.isArray(existingConfig.models) ? existingConfig.models : [];

  function normalizeApiBase(value: unknown): string {
    return String(value || "")
      .trim()
      .replace(/\/+$/, "")
      .toLowerCase();
  }

  // Check if Orbit entry already exists and update it, or add new
  const existingIdx = models.findIndex(
    (m: unknown) =>
      isJsonObject(m) &&
      (m.orbitManaged === true ||
        normalizeApiBase(m.apiBase) === normalizedBaseUrl.toLowerCase() ||
        normalizeApiBase(m.apiBase).includes("orbit") ||
        normalizeApiBase(m.apiBase).includes(`localhost:${apiPort}`) ||
        normalizeApiBase(m.apiBase).includes(`127.0.0.1:${apiPort}`) ||
        // eslint-disable-next-line no-restricted-syntax -- teknik string kontrolü, kullanıcı metni araması değil
        String(m.apiKey || "")
          .toLowerCase()
          .includes("sk_orbit"))
  );

  if (existingIdx >= 0) {
    models[existingIdx] = routerModel;
  } else {
    models.push(routerModel);
  }

  existingConfig.models = models;

  // Write back
  await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), "utf-8");

  return Response.json({
    success: true,
    message: `Continue config saved to ${configPath}`,
    configPath,
  });
}

/**
 * Save OpenCode config to the active opencode.jsonc/opencode.json on ALL platforms
 * (XDG_CONFIG_HOME aware). OpenCode uses XDG `~/.config` even on Windows
 * (%USERPROFILE%\.config), NOT %APPDATA% (#3330).
 *
 * (#524) OpenCode was silently failing because this handler was missing.
 */
async function saveOpenCodeConfig({ baseUrl, apiKey, model, models, modelLabels }: OpenCodeGuideConfig) {
  const configPath = getOpenCodeConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure config directory exists
  await fs.mkdir(configDir, { recursive: true });

  const normalizedBaseUrl = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");

  // Read existing JSONC/JSON text to preserve unrelated config formatting and fields.
  let existingConfigText = "";
  try {
    existingConfigText = await fs.readFile(configPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // File doesn't exist — start fresh.
  }

  const nextConfigText = mergeOpenCodeConfigText(existingConfigText, {
    baseUrl: normalizedBaseUrl,
    apiKey,
    model,
    models,
    modelLabels,
  });

  await fs.writeFile(configPath, nextConfigText, "utf-8");

  return Response.json({
    success: true,
    message: `OpenCode config saved to ${configPath}`,
    configPath,
  });
}

/**
 * Save Hermes config to ~/.hermes/config.yaml
 *
 * Hermes stores its primary routing settings in YAML. Preserve any existing
 * keys, but make sure the Orbit provider entry is present and selected.
 */
async function saveHermesConfig({ baseUrl, apiKey, model }: BaseGuideConfig) {
  const configPath =
    getCliPrimaryConfigPath("hermes") || path.join(os.homedir(), ".hermes", "config.yaml");
  const configDir = path.dirname(configPath);

  await fs.mkdir(configDir, { recursive: true });

  const normalizedBaseUrl = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  const providerBaseUrl = normalizedBaseUrl.endsWith("/v1")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/v1`;

  if (!model) {
    return Response.json({ error: "model is required for Hermes" }, { status: 400 });
  }
  const selectedModel = model;

  let existingConfig: JsonObject = {};
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = yaml.load(raw);
    if (isJsonObject(parsed)) {
      existingConfig = parsed;
    }
  } catch {
    // No existing config or unparsable YAML — start fresh.
  }

  const existingModel = isJsonObject(existingConfig.model) ? existingConfig.model : {};
  const existingProviders = isJsonObject(existingConfig.providers)
    ? existingConfig.providers
    : {};
  const existingGateway = isJsonObject(existingProviders.orbit)
    ? existingProviders.orbit
    : {};
  const nextConfig = {
    ...existingConfig,
    model: {
      ...existingModel,
      default: selectedModel,
      provider: "orbit",
      base_url: providerBaseUrl,
    },
    providers: {
      ...existingProviders,
      orbit: {
        ...existingGateway,
        base_url: providerBaseUrl,
        api_key:
          apiKey ||
          (typeof existingGateway.api_key === "string" ? existingGateway.api_key : "") ||
          "",
      },
    },
  };

  await fs.writeFile(configPath, yaml.dump(nextConfig, { lineWidth: -1 }), "utf-8");

  return Response.json({
    success: true,
    message: `Hermes config saved to ${configPath}`,
    configPath,
  });
}
