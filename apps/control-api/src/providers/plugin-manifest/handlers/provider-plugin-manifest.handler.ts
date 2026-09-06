import { createHash } from "node:crypto";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { getServiceModels, type ServiceModel } from "@shiguang-gateway/core-domain/embedded-services/catalog";
import { getServiceRow } from "@shiguang-gateway/core-domain/embedded-services/status";
import {
  generateProviderPluginManifest,
} from "@shiguang-gateway/open-sse/config/providerPluginManifestRegistry";
import type {
  ProviderPluginManifest,
  ProviderPluginManifestEntry,
  ProviderPluginModel,
} from "@shiguang-gateway/open-sse/config/providerPluginManifest";

/**
 * Embedded service backends are control-plane providers. Their model catalog
 * is persisted by the supervisor and merged into the static open-sse registry
 * only when the service is configured for exposure.
 */
const SERVICE_BACKEND_PLUGIN_IDS = ["9router", "cliproxyapi"] as const;
type ServiceBackendPluginId = (typeof SERVICE_BACKEND_PLUGIN_IDS)[number];
const SERVICE_BACKEND_EXPOSURE_TOOL_BY_PLUGIN_ID: Record<ServiceBackendPluginId, "9router" | "cliproxy"> = {
  "9router": "9router",
  cliproxyapi: "cliproxy",
};
const SERVICE_BACKEND_MANIFEST_TEMPLATE: Record<
  ServiceBackendPluginId,
  Pick<
    ProviderPluginManifestEntry,
    "format" | "executor" | "auth" | "endpoints" | "capabilities" | "passthroughModels" | "sidecar"
  >
> = {
  "9router": {
    format: "openai",
    executor: "default",
    auth: { type: "none", header: "authorization" },
    endpoints: { modelsUrl: "/v1/models" },
    capabilities: [],
    passthroughModels: true,
    sidecar: { eligible: false, reasons: ["runtime provider"] },
  },
  cliproxyapi: {
    format: "openai",
    executor: "default",
    auth: { type: "none", header: "authorization" },
    endpoints: { modelsUrl: "/v1/models" },
    capabilities: ["passthrough-models"],
    passthroughModels: true,
    sidecar: { eligible: false, reasons: ["runtime provider"] },
  },
};
const SERVICE_MODEL_CACHE_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "public, max-age=60",
} as const;

function createServiceManifestTemplate(providerId: ServiceBackendPluginId): ProviderPluginManifestEntry {
  const entry = SERVICE_BACKEND_MANIFEST_TEMPLATE[providerId];
  return {
    id: providerId,
    format: entry.format,
    executor: entry.executor,
    auth: entry.auth,
    endpoints: entry.endpoints,
    capabilities: [...entry.capabilities],
    passthroughModels: entry.passthroughModels,
    models: [],
    sidecar: entry.sidecar,
  };
}

function normalizeServiceModelId(tool: string, rawModelId: string): string {
  if (!rawModelId) return "";
  return rawModelId.includes("/") ? rawModelId : `${tool}/${rawModelId}`;
}

function isValidServiceModelEntry(entry: ServiceModel): boolean {
  return typeof entry === "object" && entry !== null && typeof entry.id === "string" &&
    entry.id.trim().length > 0 && entry.available !== false;
}

function toProviderPluginModel(tool: string, model: ServiceModel): ProviderPluginModel {
  const id = normalizeServiceModelId(tool, model.id);
  return {
    id,
    name: typeof model.name === "string" ? model.name : id,
    contextLength:
      typeof model.contextLength === "number" && Number.isFinite(model.contextLength)
        ? model.contextLength
        : undefined,
    maxOutputTokens:
      typeof model.maxOutputTokens === "number" && Number.isFinite(model.maxOutputTokens)
        ? model.maxOutputTokens
        : undefined,
    supportsReasoning: Boolean(model.supportsReasoning),
    supportsVision: Boolean(model.supportsVision),
    unsupportedParams:
      Array.isArray(model.unsupportedParams) && model.unsupportedParams.length > 0
        ? model.unsupportedParams
        : undefined,
    targetFormat: typeof model.targetFormat === "string" ? model.targetFormat : undefined,
  };
}

function pickServiceModels(tool: string, reader: (toolName: string) => ServiceModel[]): ProviderPluginModel[] {
  const unique = new Map<string, ProviderPluginModel>();
  for (const model of reader(tool).filter(isValidServiceModelEntry)) {
    const pluginModel = toProviderPluginModel(tool, model);
    if (!unique.has(pluginModel.id)) unique.set(pluginModel.id, pluginModel);
  }
  return [...unique.values()];
}

async function shouldExposeServiceModels(toolName: string): Promise<boolean> {
  const serviceTool = SERVICE_BACKEND_EXPOSURE_TOOL_BY_PLUGIN_ID[toolName as ServiceBackendPluginId] ?? toolName;
  const row = await getServiceRow(serviceTool);
  return row ? Boolean(row.providerExpose) : true;
}

function isServiceBackendPluginId(providerId: string): providerId is ServiceBackendPluginId {
  return (SERVICE_BACKEND_PLUGIN_IDS as readonly string[]).includes(providerId);
}

/** Inject the live embedded-service model catalog into a static manifest. */
export async function injectServiceModelsIntoManifest(
  manifest: ProviderPluginManifest,
  reader: (toolName: string) => ServiceModel[] = getServiceModels,
  exposeReader?: (toolName: string) => Promise<boolean> | boolean,
): Promise<ProviderPluginManifest> {
  const providers = [...manifest.providers];
  for (const providerId of SERVICE_BACKEND_PLUGIN_IDS) {
    if (!providers.some((provider) => provider.id === providerId)) {
      providers.push(createServiceManifestTemplate(providerId));
    }
  }

  const providersWithServiceModels = await Promise.all(
    providers.map(async (provider) => {
      if (!isServiceBackendPluginId(provider.id)) return provider;
      try {
        const shouldExpose = exposeReader
          ? Boolean(await exposeReader(provider.id))
          : await shouldExposeServiceModels(provider.id);
        if (!shouldExpose) return provider;

        const models = pickServiceModels(provider.id, reader);
        if (models.length === 0) return provider;
        const modelIds = new Set(provider.models.map((model) => model.id));
        const mergedModels = [...provider.models];
        for (const model of models) {
          if (!modelIds.has(model.id)) {
            mergedModels.push(model);
            modelIds.add(model.id);
          }
        }
        return { ...provider, models: mergedModels };
      } catch {
        return provider;
      }
    }),
  );

  return { ...manifest, providers: providersWithServiceModels };
}

function createEtag(body: string): string {
  return `"${createHash("sha256").update(body).digest("base64url")}"`;
}

function matchesEtag(ifNoneMatch: string | null, etag: string): boolean {
  return Boolean(
    ifNoneMatch?.split(",").map((value) => value.trim()).some((value) =>
      value === "*" || value === etag || value === `W/${etag}`,
    ),
  );
}

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** Public manifest endpoint; body is rebuilt per request because service models are live. */
export async function GET(request: Request): Promise<Response> {
  const body = JSON.stringify(await injectServiceModelsIntoManifest(generateProviderPluginManifest()));
  const etag = createEtag(body);
  const headers = { ...SERVICE_MODEL_CACHE_HEADERS, ETag: etag };
  if (matchesEtag(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
}
