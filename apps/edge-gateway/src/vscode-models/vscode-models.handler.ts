import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { getResolvedModelCapabilities } from "@orbit/core/catalog/model-capabilities";
import { getCanonicalModelMetadata } from "@orbit/core/catalog/model-metadata";
import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import {
  buildReasoningConfigSchema,
  buildSupportedReasoningEfforts,
  getDefaultReasoningEffort,
  getReasoningEffortValues,
  getReasoningVariantBaseModelId,
  type VscodeCatalogModel,
} from "../vscode/runtime/reasoning-metadata.js";
import {
  getVscodeModelDisplayName,
  getVscodeModelGroupingKey,
  resolveVscodeModelMetadata,
} from "../vscode/runtime/model-presentation.js";
import { withPathTokenApiKey } from "../vscode/runtime/tokenized-request.js";
import {
  expandVscodeServiceTierModels,
  getVscodeServiceTierVariantModelId,
  getVscodeServiceTierVariantSuffix,
  parseVscodeServiceTierVariantModelId,
} from "../vscode/runtime/service-tier-variants.js";
import { getFamilyFirstPublishedModelId } from "../vscode/runtime/family-first-model-ids.js";
import { isUsableChatModel } from "../vscode/runtime/usable-chat-model.js";

type CatalogModelEntry = {
  id?: string;
  name?: string;
  root?: string;
  owned_by?: string;
  parent?: string | null;
  type?: string;
  api_format?: string;
  context_length?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  supported_endpoints?: string[];
  output_modalities?: string[];
  capabilities?: Record<string, boolean>;
};

type VscodeImportModel = CatalogModelEntry & {
  url?: string;
  toolCalling?: boolean;
  vision?: boolean;
  maxInputTokens?: number;
  family?: string;
  supportsReasoningEffort?: string[];
  supportedReasoningEfforts?: string[];
  defaultReasoningEffort?: string;
  configurationSchema?: unknown;
  configSchema?: unknown;
};

type VscodeModelsCatalogResponse = {
  status: number;
  headers: Record<string, string>;
  body: { data?: CatalogModelEntry[]; [key: string]: unknown };
};

type EnrichModelForVscodeOptions = {
  preserveNativeId?: boolean;
};

export type VscodeModelsResolver = (
  request: Request,
  headers?: Record<string, string>,
) => Promise<Response>;

function usesResponsesApi(model: CatalogModelEntry) {
  return (
    model.api_format === "responses" ||
    model.api_format === "openai-responses" ||
    model.supported_endpoints?.includes("responses") === true
  );
}

function getModelImportReasoningEffortValues(model: VscodeCatalogModel, reasoningEffortValues: string[]) {
  const providerId =
    (model.owned_by || "").trim() ||
    (model.id || model.name || model.root || "").split("/")[0] ||
    "";
  if (providerId === "github" || providerId === "gh") {
    return reasoningEffortValues.filter((value) => value !== "xhigh");
  }
  return reasoningEffortValues;
}

function getVscodeImportFamily(model: CatalogModelEntry, canonicalFamily?: string | null) {
  const rawModelId = (model.root || model.id || model.name || "").trim();
  const tierParsedModel = parseVscodeServiceTierVariantModelId(rawModelId);
  const baseModelId = getReasoningVariantBaseModelId(tierParsedModel.baseModelId);
  const modelFamily = baseModelId.includes("/") ? baseModelId.split("/").slice(1).join("/") : baseModelId;

  if (modelFamily) return modelFamily;
  if (canonicalFamily && canonicalFamily.trim().length > 0) return canonicalFamily.trim();
  return typeof model.owned_by === "string" && model.owned_by.trim().length > 0 ? model.owned_by.trim() : undefined;
}

function formatReasoningEffortLabel(value: string) {
  return value === "xhigh" ? "xhigh" : value;
}

function getCatalogModelName(model: VscodeCatalogModel) {
  return model.id || model.name || model.root || "";
}

export function getVscodeRawModelDisplayName(model: CatalogModelEntry) {
  const actualModelId = (model.id || model.name || model.root || "").trim();
  const canonicalMetadata = resolveVscodeModelMetadata(model);
  const { baseModelId } = parseVscodeServiceTierVariantModelId(actualModelId);
  const displayBaseModelId = getReasoningVariantBaseModelId(baseModelId);
  const baseDisplayName = getVscodeModelDisplayName({
    ...model,
    id: displayBaseModelId,
    name: displayBaseModelId,
    root: displayBaseModelId,
  }).replace(/\s+\(Default\)$/u, "");
  const providerKey = canonicalMetadata?.providerAlias || canonicalMetadata?.provider || "";
  const providerPrefix =
    providerKey === "codex" || providerKey === "cx"
      ? "Codex"
      : providerKey === "github" || providerKey === "gh"
        ? "GitHub"
        : canonicalMetadata?.providerLabel || null;
  const prefixedDisplayName =
    providerPrefix && !baseDisplayName.toLowerCase().includes(providerPrefix.toLowerCase())
      ? `${providerPrefix} ${baseDisplayName}`.trim()
      : baseDisplayName;
  const { serviceTier } = parseVscodeServiceTierVariantModelId(actualModelId);
  const reasoningEffortValues = getReasoningEffortValues(model as VscodeCatalogModel);
  const selectedReasoningEffort = reasoningEffortValues
    ? getCatalogModelName(model as VscodeCatalogModel).match(/-(xhigh|high|medium|low|none)$/i)?.[1]?.toLowerCase()
    : undefined;

  const suffixes: string[] = [];
  if (selectedReasoningEffort && selectedReasoningEffort !== "none") suffixes.push(formatReasoningEffortLabel(selectedReasoningEffort));
  if (serviceTier) suffixes.push(getVscodeServiceTierVariantSuffix(serviceTier));
  if (suffixes.length === 0) return prefixedDisplayName;
  if (suffixes.length === 1) return `${prefixedDisplayName} (${suffixes[0]})`;
  const [first, ...rest] = suffixes;
  return `${prefixedDisplayName} (${first}) ${rest.map((suffix) => `(${suffix})`).join(" ")}`;
}

export function enrichModelForVscode(
  model: CatalogModelEntry,
  request: Request,
  options: EnrichModelForVscodeOptions = {},
): VscodeImportModel {
  if (!isUsableChatModel(model)) return model;

  const requestUrl = new URL(request.url);
  const tokenBasePath = requestUrl.pathname.replace(/\/models(?:\/raw)?\/?$/, "");
  const tokenBaseUrl = `${requestUrl.origin}${tokenBasePath}`;
  const canonicalMetadata = getCanonicalModelMetadata({
    provider: model.owned_by || null,
    model: model.root || model.id || model.name || null,
  });
  const family = getVscodeImportFamily(model, canonicalMetadata?.metadata.family || null);
  const resolvedCapabilities = getResolvedModelCapabilities(model.id || model.name || "");
  const reasoningEffortValues =
    resolvedCapabilities.reasoning === true ? getReasoningEffortValues(model as VscodeCatalogModel) : undefined;
  const modelImportReasoningEffortValues =
    reasoningEffortValues && reasoningEffortValues.length > 0
      ? getModelImportReasoningEffortValues(model as VscodeCatalogModel, reasoningEffortValues)
      : undefined;
  const defaultReasoningEffort = reasoningEffortValues
    ? getDefaultReasoningEffort(model as VscodeCatalogModel, reasoningEffortValues)
    : undefined;
  const supportedReasoningEfforts =
    reasoningEffortValues && reasoningEffortValues.length > 0
      ? buildSupportedReasoningEfforts(reasoningEffortValues)
      : undefined;
  const configSchema =
    reasoningEffortValues && defaultReasoningEffort
      ? buildReasoningConfigSchema(reasoningEffortValues, defaultReasoningEffort)
      : undefined;
  const actualModelId = (model.id || model.name || model.root || "").trim();
  const publishedModelId = getFamilyFirstPublishedModelId(actualModelId, family || null);
  const resolvedModelId = options.preserveNativeId ? actualModelId : publishedModelId;
  const presentationModel = { ...model, ...(resolvedModelId ? { id: resolvedModelId } : {}) };

  if (options.preserveNativeId) {
    return { ...presentationModel, name: getVscodeRawModelDisplayName(presentationModel) };
  }

  return {
    ...presentationModel,
    name: options.preserveNativeId ? getVscodeRawModelDisplayName(presentationModel) : getVscodeModelDisplayName(presentationModel),
    url:
      reasoningEffortValues || usesResponsesApi(model)
        ? `${tokenBaseUrl}/responses#models.ai.azure.com`
        : `${tokenBaseUrl}/chat/completions#models.ai.azure.com`,
    toolCalling: resolvedCapabilities.toolCalling === true,
    vision: resolvedCapabilities.supportsVision === true,
    maxInputTokens:
      typeof model.max_input_tokens === "number"
        ? model.max_input_tokens
        : typeof model.context_length === "number"
          ? model.context_length
          : undefined,
    family,
    ...(modelImportReasoningEffortValues ? { supportsReasoningEffort: modelImportReasoningEffortValues } : {}),
    ...(supportedReasoningEfforts ? { supportedReasoningEfforts } : {}),
    ...(defaultReasoningEffort ? { defaultReasoningEffort } : {}),
    ...(configSchema ? { configSchema } : {}),
  };
}

export function expandVscodeRawModels(models: CatalogModelEntry[]) {
  return models;
}

export async function getVscodeModelsCatalogResponse(
  request: Request,
  resolveModels: VscodeModelsResolver,
): Promise<VscodeModelsCatalogResponse> {
  const response = await resolveModels(request, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  const body = (await response.json()) as { data?: CatalogModelEntry[] };
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

async function selectPreferredModels(models: CatalogModelEntry[]) {
  const activeConnections = (await getProviderConnections({ isActive: true })) as Array<{ provider?: string }>;
  const activeProviders = new Set(
    activeConnections
      .map((connection) => (typeof connection.provider === "string" ? connection.provider.trim().toLowerCase() : ""))
      .filter(Boolean),
  );

  const preferCodexOnly = activeProviders.size > 0 && Array.from(activeProviders).every((provider) => provider === "codex");
  if (!preferCodexOnly) return models;

  const codexModels = models.filter(isCodexOwnedModel);
  return codexModels.length > 0 ? codexModels : models;
}

function isCodexOwnedModel(model: CatalogModelEntry) {
  const owner = typeof model.owned_by === "string" ? model.owned_by.trim().toLowerCase() : "";
  const modelName = (model.id || model.name || model.root || "").toLowerCase();
  return owner === "codex" || modelName.startsWith("cx/") || modelName.startsWith("codex/");
}

function filterCanonicalTagModels(models: CatalogModelEntry[]) {
  const allModelIds = new Set(models.map((model) => (model.id || model.root || model.name || "").trim()).filter(Boolean));
  const groupedModels = new Map<string, CatalogModelEntry>();
  const orderedGroupKeys: string[] = [];

  for (const model of models) {
    const modelId = (model.id || model.root || model.name || "").trim();
    if (!modelId) continue;

    const tierParsedModel = parseVscodeServiceTierVariantModelId(modelId);
    const baseModelId = getReasoningVariantBaseModelId(tierParsedModel.baseModelId);
    const canonicalModelId = tierParsedModel.serviceTier
      ? getVscodeServiceTierVariantModelId(baseModelId, tierParsedModel.serviceTier)
      : baseModelId;
    if (canonicalModelId !== modelId && allModelIds.has(canonicalModelId)) continue;

    const groupKey = tierParsedModel.serviceTier ? canonicalModelId : getVscodeModelGroupingKey(model) || canonicalModelId;
    const current = groupedModels.get(groupKey);
    if (!current) {
      groupedModels.set(groupKey, model);
      orderedGroupKeys.push(groupKey);
      continue;
    }

    const currentId = (current.id || current.root || current.name || "").trim();
    if (currentId !== groupKey && modelId === canonicalModelId) {
      groupedModels.set(groupKey, model);
    }
  }

  return orderedGroupKeys.map((groupKey) => groupedModels.get(groupKey)).filter(Boolean) as CatalogModelEntry[];
}

export async function GET(
  request: Request,
  { params }: { params?: Promise<{ token: string }> | { token: string } },
  resolveModels: VscodeModelsResolver,
) {
  const resolvedParams = params ? await params : undefined;
  const authorizedRequest = withPathTokenApiKey(request, resolvedParams?.token);
  const response = await resolveModels(authorizedRequest, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  const body = (await response.json()) as { data?: CatalogModelEntry[] };

  if (!response.ok) {
    return Response.json(body, {
      status: response.status,
      headers: { ...CORS_HEADERS },
    });
  }

  const usableModels = Array.isArray(body.data) ? body.data.filter(isUsableChatModel) : [];
  const preferredModels = filterCanonicalTagModels(expandVscodeServiceTierModels(await selectPreferredModels(usableModels)));
  const models = preferredModels.map((model) => enrichModelForVscode(model, authorizedRequest));

  return Response.json({ object: "list", data: models }, { status: response.status, headers: { ...CORS_HEADERS } });
}

export async function GET_RAW(
  request: Request,
  { params }: { params?: Promise<{ token: string }> | { token: string } },
  resolveModels: VscodeModelsResolver,
) {
  const resolvedParams = params ? await params : undefined;
  const authorizedRequest = withPathTokenApiKey(request, resolvedParams?.token);
  const catalog = await getVscodeModelsCatalogResponse(authorizedRequest, resolveModels);
  if (catalog.status < 200 || catalog.status >= 300 || !Array.isArray(catalog.body.data)) {
    return Response.json(catalog.body, {
      status: catalog.status,
      headers: catalog.headers,
    });
  }

  return Response.json(
    {
      ...catalog.body,
      data: expandVscodeRawModels(catalog.body.data).map((model) => enrichModelForVscode(model, authorizedRequest, { preserveNativeId: true })),
    },
    {
      status: catalog.status,
      headers: catalog.headers,
    },
  );
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export function OPTIONS_RAW(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
