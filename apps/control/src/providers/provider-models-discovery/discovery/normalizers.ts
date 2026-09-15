import { SAFE_OUTBOUND_FETCH_PRESETS, safeOutboundFetch } from "@orbit/core/network/safe-outbound-fetch";
import { getProviderOutboundGuard } from "@orbit/core/network/outbound-url-guard-policy";
import {
  getAntigravityModelsDiscoveryUrls,
  getAntigravityFetchAvailableModelsUrls,
} from "@orbit/inference/config/antigravity-upstream";
import { getAntigravityContentHeaders } from "@orbit/inference/services/antigravity-headers";
import { resolveAntigravityClientVersion } from "@orbit/inference/services/antigravity-client-profile";
import {
  getClientVisibleAntigravityModelName,
  toClientAntigravityModelId,
} from "@orbit/inference/config/antigravityModelAliases";
import {
  getClientVisibleAgyModelName,
} from "@orbit/inference/config/agyModels";
import { normalizeAntigravityClientProfile } from "@orbit/contracts/provider-client-profiles";
import {
  collapseDiscoveredEffortVariants,
  collapseDiscoveredThinkingVariants,
} from "@orbit/core/control/provider-discovery-support/modelDiscovery";
import { ensureAntigravityProjectAssigned } from "@orbit/inference/services/antigravityProjectBootstrap";
import { persistDiscoveredAntigravityProjectId } from "@orbit/inference/services/antigravityProjectPersist";
import { asRecord, toNonEmptyString } from "./helpers.js";

const antigravityDiscoveryInflight = new Map<
  string,
  Promise<Array<{ id: string; name: string }>>
>();

type AntigravityDiscoveryModel = {
  id: string;
  name: string;
  source: "imported";
  isInternal?: boolean;
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsVideo?: boolean;
  supportedThinkingEfforts?: string[];
  supportedEndpoints?: string[];
  effortModelIds?: Record<string, string>;
  tieredModelId?: string;
  thinkingModelId?: string;
  /** Token window advertised by the upstream discovery payload, when present. */
  inputTokenLimit?: number;
  outputTokenLimit?: number;
};

function deriveAntigravityDisplayName(id: string): string {
  const base = id.replace(/-tiered$/i, "");
  return base
    .split("-")
    .filter(Boolean)
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function antigravityDisplayFamily(name: string): string {
  return name
    .replace(/\s*\((?:none|extra-low|low|medium|high|xhigh|max|thinking|tiered)\)\s*$/i, "")
    .trim()
    .toLowerCase();
}

/**
 * A few AGY rows use a provider-internal id (`gemini-pro-agent`) while the
 * neighboring effort rows use the public family id (`gemini-3.1-pro-low`).
 * Their display family is the stable contract, so merge only when a group has
 * an explicit effort/tiered suffix or a known agent row; never merge arbitrary
 * rows solely because their (occasionally stale) display names collide.
 */
function collapseAntigravityDisplayVariants(
  models: readonly AntigravityDiscoveryModel[]
): AntigravityDiscoveryModel[] {
  const groups = new Map<string, AntigravityDiscoveryModel[]>();
  for (const model of models) {
    const key = antigravityDisplayFamily(model.name);
    const idLooksVariant = /-(?:none|extra-low|low|medium|high|xhigh|max|tiered)$/i.test(model.id);
    const isAgentAlias = model.id === "gemini-pro-agent";
    const isAggregatedBase = Boolean(model.effortModelIds || model.tieredModelId || model.thinkingModelId);
    if (!key || (!idLooksVariant && !isAgentAlias && !isAggregatedBase)) continue;
    const group = groups.get(key) || [];
    group.push(model);
    groups.set(key, group);
  }

  const consumed = new Set<string>();
  const output: AntigravityDiscoveryModel[] = [];
  for (const model of models) {
    if (consumed.has(model.id)) continue;
    const key = antigravityDisplayFamily(model.name);
    const group = groups.get(key) || [];
    if (group.length < 2) {
      output.push(model);
      continue;
    }
    const base = group.find((candidate) => candidate.id !== "gemini-pro-agent") || group[0];
    const merged: AntigravityDiscoveryModel = { ...base };
    const effortModelIds = { ...(base.effortModelIds || {}) };
    for (const candidate of group) {
      consumed.add(candidate.id);
      if (candidate.supportsThinking === true) merged.supportsThinking = true;
      if (candidate.supportsVision === true) merged.supportsVision = true;
      if (candidate.supportsVideo === true) merged.supportsVideo = true;
      if (candidate.tieredModelId) merged.tieredModelId = candidate.tieredModelId;
      if (candidate.thinkingModelId) merged.thinkingModelId = candidate.thinkingModelId;
      for (const [effort, id] of Object.entries(candidate.effortModelIds || {})) {
        effortModelIds[effort] = id;
      }
      const effortMatch = candidate.id.match(/-(none|extra-low|low|medium|high|xhigh|max)$/i);
      if (effortMatch) effortModelIds[effortMatch[1].toLowerCase()] = candidate.id;
      if (candidate.id === "gemini-pro-agent") effortModelIds.high = candidate.id;
    }
    if (Object.keys(effortModelIds).length > 0) {
      merged.effortModelIds = effortModelIds;
      merged.supportedThinkingEfforts = Object.keys(effortModelIds);
    }
    output.push(merged);
  }
  return output;
}

/**
 * Forward discovery-advertised token windows when the upstream payload carries
 * them. Field names are probed defensively (payload shape is not contractual);
 * absent/non-numeric fields yield no entry, so nothing downstream changes.
 */
function extractDiscoveryTokenLimits(item: Record<string, unknown>): {
  inputTokenLimit?: number;
  outputTokenLimit?: number;
} {
  const limits: { inputTokenLimit?: number; outputTokenLimit?: number } = {};
  const input = item.inputTokenLimit ?? item.contextWindow;
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    limits.inputTokenLimit = input;
  }
  const output = item.outputTokenLimit ?? item.maxOutputTokens;
  if (typeof output === "number" && Number.isFinite(output) && output > 0) {
    limits.outputTokenLimit = output;
  }
  return limits;
}

export function normalizeAntigravityModelsResponse(data: unknown): AntigravityDiscoveryModel[] {
  const envelope = asRecord(data);
  const payload = envelope.models;

  const isInternalModel = (item: Record<string, unknown>): boolean =>
    item.isInternal === true || item.apiProvider === "API_PROVIDER_INTERNAL";

  const parseRawModels = (): AntigravityDiscoveryModel[] => {
    if (Array.isArray(payload)) {
      return payload
        .map((value) => {
          const item = asRecord(value);
          if (isInternalModel(item)) return null;
          const id =
            typeof item.id === "string"
              ? item.id
              : typeof item.name === "string"
                ? item.name
                : typeof item.model === "string"
                  ? item.model
                  : "";
          const name =
            typeof item.displayName === "string"
              ? item.displayName
              : typeof item.name === "string"
                ? item.name
                : deriveAntigravityDisplayName(id);
          return id
            ? {
                id,
                name,
                source: "imported",
                ...extractDiscoveryTokenLimits(item),
                ...(item.supportsThinking === true || typeof item.thinkingBudget === "number"
                  ? { supportsThinking: true }
                  : {}),
                ...(item.supportsImages === true ? { supportsVision: true } : {}),
                ...(item.supportsVideo === true ? { supportsVideo: true } : {}),
                ...(id.endsWith("-tiered") &&
                (item.supportsThinking === true || typeof item.thinkingBudget === "number")
                  ? { supportedThinkingEfforts: ["low", "medium", "high"] }
                  : {}),
              }
            : null;
        })
        .filter((value): value is AntigravityDiscoveryModel => Boolean(value));
    }

    const modelsById = asRecord(payload);
    return Object.entries(modelsById)
      .map(([id, value]) => {
        const item = asRecord(value);
        if (isInternalModel(item)) return null;
        const name =
          typeof item.displayName === "string"
            ? item.displayName
            : typeof item.name === "string"
              ? item.name
              : deriveAntigravityDisplayName(id);
        return id
          ? {
              id,
              name,
              source: "imported",
              ...extractDiscoveryTokenLimits(item),
              ...(item.supportsThinking === true || typeof item.thinkingBudget === "number"
                ? { supportsThinking: true }
                : {}),
              ...(item.supportsImages === true ? { supportsVision: true } : {}),
              ...(item.supportsVideo === true ? { supportsVideo: true } : {}),
              ...(id.endsWith("-tiered") &&
              (item.supportsThinking === true || typeof item.thinkingBudget === "number")
                ? { supportedThinkingEfforts: ["low", "medium", "high"] }
                : {}),
            }
          : null;
      })
      .filter((value): value is AntigravityDiscoveryModel => Boolean(value));
  };

  const rawModels = parseRawModels();
  if (rawModels.length === 0) return rawModels;

  const imageSet = new Set(
    Array.isArray(envelope.imageGenerationModelIds)
      ? envelope.imageGenerationModelIds.filter((id): id is string => typeof id === "string")
      : []
  );
  const videoSet = new Set(
    Array.isArray(envelope.videoGenerationModelIds)
      ? envelope.videoGenerationModelIds.filter((id): id is string => typeof id === "string")
      : []
  );
  const enrichedModels = rawModels.map((model) => {
    const endpoints = new Set(model.supportedEndpoints || []);
    if (imageSet.has(model.id)) endpoints.add("images");
    if (videoSet.has(model.id)) endpoints.add("videos");
    return endpoints.size > 0 ? { ...model, supportedEndpoints: [...endpoints] } : model;
  });
  // `agentModelSorts` is only a picker ordering/allowlist for one CLI surface.
  // The provider catalog is the `models` object itself; collapse native effort,
  // thinking, and tiered ids after reading that authoritative set.
  return collapseAntigravityDisplayVariants(
    collapseDiscoveredThinkingVariants(collapseDiscoveredEffortVariants(enrichedModels))
  );
}

export function mapAntigravityModelForClient(
  model: {
    id: string;
    name: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportsThinking?: boolean;
    supportsVision?: boolean;
    supportsVideo?: boolean;
    supportedThinkingEfforts?: string[];
    effortModelIds?: Record<string, string>;
    tieredModelId?: string;
    thinkingModelId?: string;
    supportedEndpoints?: string[];
  },
  provider: "antigravity" | "agy" = "antigravity"
): {
  id: string;
  name: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsVideo?: boolean;
  supportedThinkingEfforts?: string[];
  effortModelIds?: Record<string, string>;
  tieredModelId?: string;
  thinkingModelId?: string;
  supportedEndpoints?: string[];
} {
  const clientId = toClientAntigravityModelId(model.id);
  return {
    id: clientId,
    name:
      provider === "agy"
        ? getClientVisibleAgyModelName(clientId, model.name)
        : getClientVisibleAntigravityModelName(clientId, model.name),
    ...(typeof model.inputTokenLimit === "number"
      ? { inputTokenLimit: model.inputTokenLimit }
      : {}),
    ...(typeof model.outputTokenLimit === "number"
      ? { outputTokenLimit: model.outputTokenLimit }
      : {}),
    ...(model.supportsThinking === true ? { supportsThinking: true } : {}),
    ...(model.supportsVision === true ? { supportsVision: true } : {}),
    ...(model.supportsVideo === true ? { supportsVideo: true } : {}),
    ...(Array.isArray(model.supportedThinkingEfforts)
      ? { supportedThinkingEfforts: model.supportedThinkingEfforts }
      : {}),
    ...(model.effortModelIds
      ? {
          effortModelIds: Object.fromEntries(
            Object.entries(model.effortModelIds).map(([effort, id]) => [
              effort,
              toClientAntigravityModelId(id),
            ])
          ),
        }
      : {}),
    ...(model.tieredModelId
      ? { tieredModelId: toClientAntigravityModelId(model.tieredModelId) }
      : {}),
    ...(model.thinkingModelId
      ? { thinkingModelId: toClientAntigravityModelId(model.thinkingModelId) }
      : {}),
    ...(Array.isArray(model.supportedEndpoints)
      ? { supportedEndpoints: model.supportedEndpoints }
      : {}),
  };
}

export async function fetchAntigravityDiscoveryModelsCached(
  accessToken: string,
  connectionId: string,
  proxy: unknown,
  providerSpecificData?: unknown,
  provider: "antigravity" | "agy" = "antigravity"
): Promise<
  Array<{
    id: string;
    name: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportsThinking?: boolean;
    supportsVision?: boolean;
    supportsVideo?: boolean;
    supportedThinkingEfforts?: string[];
    effortModelIds?: Record<string, string>;
    tieredModelId?: string;
    thinkingModelId?: string;
    supportedEndpoints?: string[];
  }>
> {
  const profile = normalizeAntigravityClientProfile(asRecord(providerSpecificData).clientProfile);
  const cacheKey = `${provider}:${connectionId}:${accessToken.substring(0, 16)}:${profile}`;
  const inflight = antigravityDiscoveryInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    await resolveAntigravityClientVersion(profile);
    const discovered = await ensureAntigravityProjectAssigned(accessToken, fetch, profile);
    if (discovered) {
      // #8491: persist the recovered id so it survives the next token refresh
      // or process restart instead of being silently rediscovered every time.
      await persistDiscoveredAntigravityProjectId(
        connectionId,
        discovered,
        asRecord(providerSpecificData)
      );
    }

    for (const discoveryUrl of [
      ...getAntigravityFetchAvailableModelsUrls(),
      ...getAntigravityModelsDiscoveryUrls(),
    ]) {
      try {
        const response = await safeOutboundFetch(discoveryUrl, {
          ...SAFE_OUTBOUND_FETCH_PRESETS.modelsDiscovery,
          guard: getProviderOutboundGuard(),
          proxyConfig: proxy,
          method: "POST",
          headers: getAntigravityContentHeaders(profile, accessToken),
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(
            `[models] ${provider} discovery failed at ${discoveryUrl} (${response.status}): ${errorText}`
          );
          continue;
        }

        // The sync/import surface must mirror the authenticated upstream catalog.
        // Keep every model returned by fetchAvailableModels; allowlisting and
        // chat-selectability are runtime concerns, not import transformations.
        const models = normalizeAntigravityModelsResponse(await response.json()).map((model) =>
          mapAntigravityModelForClient(model, provider)
        );
        if (models.length > 0) {
          return models;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[models] ${provider} discovery threw for ${discoveryUrl}: ${message}`);
      }
    }

    return [];
  })().finally(() => {
    antigravityDiscoveryInflight.delete(cacheKey);
  });

  antigravityDiscoveryInflight.set(cacheKey, promise);
  return promise;
}

export function normalizeDataRobotCatalogResponse(
  data: unknown
): Array<{ id: string; name: string }> {
  const items = Array.isArray(asRecord(data).data) ? (asRecord(data).data as unknown[]) : [];

  return items
    .map((value) => {
      const item = asRecord(value);
      const model =
        toNonEmptyString(item.model) || toNonEmptyString(item.id) || toNonEmptyString(item.name);
      if (!model) return null;
      if (item.isActive === false) return null;
      const name = toNonEmptyString(item.label) || toNonEmptyString(item.displayName) || model;
      return { id: model, name };
    })
    .filter((value): value is { id: string; name: string } => Boolean(value));
}

export function normalizeOpenAiLikeModelsResponse(
  data: unknown,
  fallbackOwner: string
): Array<{
  id: string;
  name: string;
  owned_by: string;
  apiFormat?: string;
  supportedEndpoints?: string[];
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsVideo?: boolean;
  supportedThinkingEfforts?: string[];
}> {
  const payload = asRecord(data);
  const items = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? (payload.data as unknown[])
      : Array.isArray(payload.models)
        ? (payload.models as unknown[])
        : [];

  return items
    .map((value) => {
      const item = asRecord(value);
      const id =
        toNonEmptyString(item.id) || toNonEmptyString(item.model) || toNonEmptyString(item.name);
      if (!id) return null;
      const name =
        toNonEmptyString(item.display_name) ||
        toNonEmptyString(item.displayName) ||
        toNonEmptyString(item.name) ||
        id;
      const ownedBy =
        toNonEmptyString(item.owned_by) || toNonEmptyString(item.provider) || fallbackOwner;
      const supportedEndpoints = Array.from(
        new Set(
          [item.supportedEndpoints, item.supported_endpoints, item.endpoints]
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );
      const supportedThinkingEfforts = Array.from(
        new Set(
          [item.supportedThinkingEfforts, item.supported_reasoning_levels]
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );
      const inputModalities = [item.inputModalities, item.input_modalities]
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((value): value is string => typeof value === "string");
      const supportsThinking =
        item.supportsThinking === true ||
        item.supports_thinking === true ||
        item.supportsReasoning === true ||
        item.supports_reasoning === true ||
        supportedThinkingEfforts.length > 0;
      const supportsVision =
        item.supportsVision === true ||
        item.supports_vision === true ||
        item.supportsImages === true ||
        item.supports_images === true ||
        inputModalities.some((modality) => modality.toLowerCase() === "image");
      const supportsVideo =
        item.supportsVideo === true ||
        item.supports_video === true ||
        supportedEndpoints.some((endpoint) => /^videos?(?:[/.]|$)/i.test(endpoint));
      const apiFormat = toNonEmptyString(item.apiFormat) || toNonEmptyString(item.api_format);
      return {
        id,
        name,
        owned_by: ownedBy,
        ...(apiFormat ? { apiFormat } : {}),
        ...(supportedEndpoints.length > 0 ? { supportedEndpoints } : {}),
        ...(supportsThinking ? { supportsThinking: true } : {}),
        ...(supportsVision ? { supportsVision: true } : {}),
        ...(supportsVideo ? { supportsVideo: true } : {}),
        ...(supportedThinkingEfforts.length > 0 ? { supportedThinkingEfforts } : {}),
      };
    })
    .filter((value): value is { id: string; name: string; owned_by: string } => Boolean(value));
}

export function normalizeSapModelsResponse(
  data: unknown
): Array<{ id: string; name: string; owned_by: string }> {
  const payload = asRecord(data);
  const items = Array.isArray(payload.resources) ? (payload.resources as unknown[]) : [];

  return items
    .map((value) => {
      const item = asRecord(value);
      const id =
        toNonEmptyString(item.model) || toNonEmptyString(item.id) || toNonEmptyString(item.name);
      if (!id) return null;
      const name =
        toNonEmptyString(item.displayName) ||
        toNonEmptyString(item.display_name) ||
        toNonEmptyString(item.name) ||
        id;
      const ownedBy = toNonEmptyString(item.provider) || "sap";
      return { id, name, owned_by: ownedBy };
    })
    .filter((value): value is { id: string; name: string; owned_by: string } => Boolean(value));
}

export function normalizeAzureModelsResponse(
  data: unknown,
  fallbackOwner = "azure-ai"
): Array<{ id: string; name: string; owned_by: string }> {
  const payload = asRecord(data);
  const items = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? (payload.data as unknown[])
      : Array.isArray(payload.models)
        ? (payload.models as unknown[])
        : Array.isArray(payload.value)
          ? (payload.value as unknown[])
          : Array.isArray(payload.deployments)
            ? (payload.deployments as unknown[])
            : [];

  return items
    .map((value) => {
      const item = asRecord(value);
      const id =
        toNonEmptyString(item.id) ||
        toNonEmptyString(item.deployment_name) ||
        toNonEmptyString(item.deploymentName) ||
        toNonEmptyString(item.name) ||
        toNonEmptyString(item.model);
      if (!id) return null;
      const name =
        toNonEmptyString(item.display_name) ||
        toNonEmptyString(item.displayName) ||
        toNonEmptyString(item.name) ||
        id;
      const ownedBy =
        toNonEmptyString(item.owned_by) || toNonEmptyString(item.provider) || fallbackOwner;
      return { id, name, owned_by: ownedBy };
    })
    .filter((value): value is { id: string; name: string; owned_by: string } => Boolean(value));
}
