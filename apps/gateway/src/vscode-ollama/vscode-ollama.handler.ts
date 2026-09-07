import type { VscodeModelsResolver } from "../vscode-models/vscode-models.handler.js";
import { getCanonicalModelMetadata } from "@orbit/core/catalog/model-metadata";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import {
  buildReasoningConfigSchema,
  buildSupportedReasoningEfforts,
  getDefaultReasoningEffort,
  getReasoningVariantBaseModelId,
  getReasoningEffortValues,
  inferSelectedReasoningEffort,
  type VscodeCatalogModel,
} from "../vscode/runtime/reasoning-metadata.js";
import { getVscodeModelDisplayName, getVscodeModelGroupingKey } from "../vscode/runtime/model-presentation.js";
import {
  expandVscodeServiceTierModels,
  getVscodeServiceTierVariantModelId,
  parseVscodeServiceTierVariantModelId,
} from "../vscode/runtime/service-tier-variants.js";
import { getFamilyFirstModelCandidates, getFamilyFirstPublishedModelId } from "../vscode/runtime/family-first-model-ids.js";
import { withPathTokenApiKey } from "../vscode/runtime/tokenized-request.js";
import { isUsableChatModel } from "../vscode/runtime/usable-chat-model.js";

type OpenAiCatalogModel = {
  id?: string;
  name?: string;
  root?: string;
  parent?: string | null;
  owned_by?: string;
  type?: string;
  api_format?: string;
  context_length?: number;
  max_output_tokens?: number;
  capabilities?: Record<string, boolean>;
  input_modalities?: string[];
  output_modalities?: string[];
  supported_endpoints?: string[];
};

function getModelName(model: OpenAiCatalogModel) {
  return model.id || model.name || model.root || "";
}

function isCodexOwnedModel(model: OpenAiCatalogModel) {
  const owner = typeof model.owned_by === "string" ? model.owned_by.trim().toLowerCase() : "";
  const modelName = getModelName(model).toLowerCase();
  return owner === "codex" || modelName.startsWith("cx/") || modelName.startsWith("codex/");
}

async function selectPreferredModels(models: OpenAiCatalogModel[]) {
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

function getOllamaModelFamily(model: OpenAiCatalogModel, canonicalFamily?: string | null) {
  const rawModelId = getModelName(model).trim();
  const tierParsedModel = parseVscodeServiceTierVariantModelId(rawModelId);
  const baseModelId = getReasoningVariantBaseModelId(tierParsedModel.baseModelId);
  const modelFamily = baseModelId.includes("/") ? baseModelId.split("/").slice(1).join("/") : baseModelId;
  if (modelFamily) return modelFamily;
  if (canonicalFamily && canonicalFamily.trim().length > 0) return canonicalFamily.trim();
  return typeof model.owned_by === "string" && model.owned_by.trim().length > 0 ? model.owned_by.trim() : "orbit";
}

function toOllamaTagModel(model: OpenAiCatalogModel) {
  const actualModelId = model.id || model.root || "unknown";
  const canonicalMetadata = getCanonicalModelMetadata({
    provider: model.owned_by || null,
    model: model.root || model.id || model.name || null,
  });
  const family = getOllamaModelFamily(model, canonicalMetadata?.metadata.family || null);
  const modelId = getFamilyFirstPublishedModelId(actualModelId, family);
  const contextLength = typeof model.context_length === "number" ? model.context_length : 0;
  const reasoningEffortValues = getReasoningEffortValues(model as VscodeCatalogModel);
  const selectedReasoningEffort = reasoningEffortValues ? inferSelectedReasoningEffort(model as VscodeCatalogModel, reasoningEffortValues) || "none" : undefined;
  const defaultReasoningEffort = reasoningEffortValues ? getDefaultReasoningEffort(model as VscodeCatalogModel, reasoningEffortValues) : undefined;
  const supportedReasoningEfforts = reasoningEffortValues && reasoningEffortValues.length > 0 ? buildSupportedReasoningEfforts(reasoningEffortValues) : undefined;
  const configSchema = reasoningEffortValues && defaultReasoningEffort ? buildReasoningConfigSchema(reasoningEffortValues, defaultReasoningEffort) : undefined;

  return {
    name: modelId,
    model: modelId,
    modified_at: "2026-01-01T00:00:00Z",
    size: 0,
    digest: `orbit:${modelId}`,
    ...(reasoningEffortValues
      ? {
          supports_reasoning_effort: reasoningEffortValues,
          supportsReasoningEffort: reasoningEffortValues,
          supportedReasoningEfforts,
          defaultReasoningEffort,
          selected_reasoning_effort: selectedReasoningEffort,
          selectedReasoningEffort,
          ...(configSchema ? { configurationSchema: configSchema } : {}),
          ...(configSchema ? { configSchema } : {}),
        }
      : {}),
    details: {
      format: "openai",
      family,
      parameter_size: contextLength > 0 ? `${contextLength} ctx` : "unknown",
      quantization_level: "dynamic",
      ...(reasoningEffortValues
        ? {
            supports_reasoning_effort: reasoningEffortValues,
            supportsReasoningEffort: reasoningEffortValues,
            supportedReasoningEfforts,
            defaultReasoningEffort,
            selected_reasoning_effort: selectedReasoningEffort,
            selectedReasoningEffort,
            ...(configSchema ? { configurationSchema: configSchema } : {}),
            ...(configSchema ? { configSchema } : {}),
          }
        : {}),
    },
    capabilities: ["completion", ...(model.capabilities?.vision ? ["vision"] : []), ...(model.capabilities?.tool_calling ? ["tools"] : []), ...(model.capabilities?.reasoning || model.capabilities?.thinking ? ["thinking"] : [])],
  };
}

function filterCanonicalTagModels(models: OpenAiCatalogModel[]) {
  const allModelIds = new Set(models.map((model) => (model.id || model.root || model.name || "").trim()).filter(Boolean));
  const groupedModels = new Map<string, OpenAiCatalogModel>();
  const orderedGroupKeys: string[] = [];
  for (const model of models) {
    const modelId = (model.id || model.root || model.name || "").trim();
    if (!modelId) continue;
    const tierParsedModel = parseVscodeServiceTierVariantModelId(modelId);
    const baseModelId = getReasoningVariantBaseModelId(tierParsedModel.baseModelId);
    const canonicalModelId = tierParsedModel.serviceTier ? getVscodeServiceTierVariantModelId(baseModelId, tierParsedModel.serviceTier) : baseModelId;
    if (canonicalModelId !== modelId && allModelIds.has(canonicalModelId)) continue;
    const groupKey = tierParsedModel.serviceTier ? canonicalModelId : getVscodeModelGroupingKey(model) || canonicalModelId;
    const current = groupedModels.get(groupKey);
    if (!current) {
      groupedModels.set(groupKey, model);
      orderedGroupKeys.push(groupKey);
      continue;
    }
    const currentId = (current.id || current.root || current.name || "").trim();
    if (currentId !== groupKey && modelId === canonicalModelId) groupedModels.set(groupKey, model);
  }
  return orderedGroupKeys.map((groupKey) => groupedModels.get(groupKey)).filter(Boolean) as OpenAiCatalogModel[];
}

function buildShowPayload(model: OpenAiCatalogModel, responseModelId?: string) {
  const actualModelId = getModelName(model);
  const displayName = getVscodeModelDisplayName(model);
  const canonicalMetadata = getCanonicalModelMetadata({
    provider: model.owned_by || null,
    model: model.root || model.id || model.name || null,
  });
  const family = getOllamaModelFamily(model, canonicalMetadata?.metadata.family || null);
  const modelId = responseModelId || getFamilyFirstPublishedModelId(actualModelId, family);
  const architectureSource = (canonicalMetadata?.providerAlias || canonicalMetadata?.provider || model.owned_by || family || "model").trim().toLowerCase();
  const architecture = architectureSource === "cx" ? "codex" : architectureSource === "gh" ? "github" : architectureSource.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "model";
  const reasoningEffortValues = getReasoningEffortValues(model as VscodeCatalogModel);
  const selectedReasoningEffort = reasoningEffortValues ? inferSelectedReasoningEffort(model as VscodeCatalogModel, reasoningEffortValues) || "none" : undefined;
  const defaultReasoningEffort = reasoningEffortValues ? getDefaultReasoningEffort(model as VscodeCatalogModel, reasoningEffortValues) : undefined;
  const supportedReasoningEfforts = reasoningEffortValues && reasoningEffortValues.length > 0 ? buildSupportedReasoningEfforts(reasoningEffortValues) : undefined;
  const configSchema = reasoningEffortValues && defaultReasoningEffort ? buildReasoningConfigSchema(reasoningEffortValues, defaultReasoningEffort) : undefined;
  let modelCapabilities = model.capabilities ? { ...model.capabilities } : undefined;
  if (reasoningEffortValues) {
    modelCapabilities = modelCapabilities || {};
    Object.assign(modelCapabilities, {
      reasoning: true,
      thinking: true,
      supports_reasoning_effort: reasoningEffortValues,
      supportsReasoningEffort: reasoningEffortValues,
      supportedReasoningEfforts,
      defaultReasoningEffort,
      selected_reasoning_effort: selectedReasoningEffort,
      selectedReasoningEffort,
      ...(configSchema ? { configurationSchema: configSchema } : {}),
      ...(configSchema ? { configSchema } : {}),
    });
  }
  return {
    model: modelId,
    remote_model: displayName,
    ...(reasoningEffortValues
      ? {
          supports_reasoning_effort: reasoningEffortValues,
          supportsReasoningEffort: reasoningEffortValues,
          supportedReasoningEfforts,
          defaultReasoningEffort,
          selected_reasoning_effort: selectedReasoningEffort,
          selectedReasoningEffort,
          ...(configSchema ? { configurationSchema: configSchema } : {}),
          ...(configSchema ? { configSchema } : {}),
        }
      : {}),
    license: "proprietary",
    modelfile: `FROM ${modelId}`,
    parameters: "",
    template: "",
    details: {
      parent_model: model.root || actualModelId || "",
      format: "openai",
      family,
      families: [family],
      parameter_size: "unknown",
      quantization_level: "dynamic",
      ...(reasoningEffortValues
        ? {
            supports_reasoning_effort: reasoningEffortValues,
            supportsReasoningEffort: reasoningEffortValues,
            supportedReasoningEfforts,
            defaultReasoningEffort,
            selected_reasoning_effort: selectedReasoningEffort,
            selectedReasoningEffort,
            ...(configSchema ? { configurationSchema: configSchema } : {}),
            ...(configSchema ? { configSchema } : {}),
          }
        : {}),
    },
    model_info: {
      "general.architecture": architecture,
      "general.basename": displayName,
      ...(typeof model.context_length === "number" ? { context_length: model.context_length } : {}),
      ...(typeof model.context_length === "number" ? { [`${architecture}.context_length`]: model.context_length } : {}),
      ...(typeof model.max_output_tokens === "number" ? { max_output_tokens: model.max_output_tokens } : {}),
      ...(Array.isArray(model.input_modalities) ? { input_modalities: model.input_modalities } : {}),
      ...(Array.isArray(model.output_modalities) ? { output_modalities: model.output_modalities } : {}),
      ...(Array.isArray(model.supported_endpoints) ? { supported_endpoints: model.supported_endpoints } : {}),
      ...(modelCapabilities ? { capabilities: modelCapabilities } : {}),
      ...(reasoningEffortValues
        ? {
            supports_reasoning_effort: reasoningEffortValues,
            supportsReasoningEffort: reasoningEffortValues,
            supportedReasoningEfforts,
            defaultReasoningEffort,
            selected_reasoning_effort: selectedReasoningEffort,
            selectedReasoningEffort,
            ...(configSchema ? { configurationSchema: configSchema } : {}),
            ...(configSchema ? { configSchema } : {}),
          }
        : {}),
    },
    capabilities: ["completion", ...(model.capabilities?.vision ? ["vision"] : []), ...(model.capabilities?.tool_calling ? ["tools"] : []), ...(model.capabilities?.reasoning || model.capabilities?.thinking ? ["thinking"] : [])],
  };
}

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request, { params }: { params?: Promise<{ token: string }> | { token: string } }, resolveModels: VscodeModelsResolver) {
  const resolvedParams = params ? await params : undefined;
  const authorizedRequest = withPathTokenApiKey(request, resolvedParams?.token);
  const response = await resolveModels(authorizedRequest, { "Content-Type": "application/json", ...CORS_HEADERS });
  const body = (await response.json()) as { data?: OpenAiCatalogModel[] };
  if (!response.ok) return Response.json(body, { status: response.status, headers: { ...CORS_HEADERS } });
  const usableModels = Array.isArray(body.data) ? body.data.filter(isUsableChatModel) : [];
  const preferredModels = filterCanonicalTagModels(expandVscodeServiceTierModels(await selectPreferredModels(usableModels)));
  return Response.json({ models: preferredModels.map(toOllamaTagModel) }, { headers: { ...CORS_HEADERS } });
}

function getRequestedModelName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidate = record.name ?? record.model;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function matchesRequestedModel(model: OpenAiCatalogModel, requestedName: string): boolean {
  const canonicalMetadata = getCanonicalModelMetadata({
    provider: model.owned_by || null,
    model: model.root || model.id || model.name || null,
  });
  const family = getOllamaModelFamily(model, canonicalMetadata?.metadata.family || null);
  const actualModelId = getModelName(model);
  return [model.id, model.name, model.root, canonicalMetadata?.qualifiedId, canonicalMetadata?.model, ...getFamilyFirstModelCandidates(actualModelId, family)].some((value) => value === requestedName);
}

export async function POST(request: Request, { params }: { params?: Promise<{ token: string }> | { token: string } }, resolveModels: VscodeModelsResolver) {
  const resolvedParams = params ? await params : undefined;
  const authorizedRequest = withPathTokenApiKey(request, resolvedParams?.token);
  const payload = await request.clone().json().catch(() => null);
  const requestedName = getRequestedModelName(payload);
  if (!requestedName) return Response.json({ error: "Model name is required" }, { status: 400, headers: { ...CORS_HEADERS } });
  const catalogResponse = await resolveModels(authorizedRequest, { "Content-Type": "application/json", ...CORS_HEADERS });
  const catalogBody = (await catalogResponse.json()) as { data?: OpenAiCatalogModel[] };
  if (!catalogResponse.ok) return Response.json(catalogBody, { status: catalogResponse.status, headers: { ...CORS_HEADERS } });
  const expandedModels = Array.isArray(catalogBody.data) ? expandVscodeServiceTierModels(catalogBody.data.filter(isUsableChatModel)) : [];
  const model = Array.isArray(expandedModels) ? expandedModels.find((entry) => matchesRequestedModel(entry, requestedName)) : undefined;
  if (!model) return Response.json({ error: `Model not found: ${requestedName}` }, { status: 404, headers: { ...CORS_HEADERS } });
  return Response.json(buildShowPayload(model, requestedName), { headers: { ...CORS_HEADERS } });
}

export const SHOW_OPTIONS = OPTIONS;
export const SHOW_POST = POST;
export const TAGS_OPTIONS = OPTIONS;
export const TAGS = GET;
