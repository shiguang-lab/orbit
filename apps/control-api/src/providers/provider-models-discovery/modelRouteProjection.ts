import { getRegistryEntry } from "@shiguang-gateway/open-sse/config/providerRegistry";
import { filterChatSelectableModels } from "@shiguang-gateway/open-sse/services/modelEndpointPolicy";
import { filterSelectableModels } from "@shiguang-gateway/open-sse/services/modelLifecycle";
import { getModelIsHidden } from "@shiguang-gateway/core-domain/control/provider-discovery-support/modelsDb";
import { getSettings } from "@shiguang-gateway/core-domain/control/provider-discovery-support/settings";
import { getStaticModelsForProvider } from "@shiguang-gateway/open-sse/services/static-models";
import { SAFE_OUTBOUND_FETCH_PRESETS, safeOutboundFetch } from "@shiguang-gateway/core-domain/control/provider-discovery-support/safeOutboundFetch";
import { getProviderOutboundGuard } from "@shiguang-gateway/core-domain/control/provider-discovery-support/outboundUrlGuardPolicy";
import { getModelsByProviderId } from "@shiguang-gateway/core-domain/control/provider-discovery-support/models";
import { isProviderBlockedByIdOrAlias } from "@shiguang-gateway/core-domain/control/provider-discovery-support/noAuthProviders";
import { mergeLocalCatalogModels } from "./discovery/helpers.js";

export function filterModelsForRoute<
  T extends { id: string; supportedEndpoints?: readonly string[] },
>(provider: string, models: readonly T[], chatOnly: boolean): T[] {
  const selectable = filterSelectableModels(provider, models);
  return chatOnly ? filterChatSelectableModels(provider, selectable) : selectable;
}

function toLiveModel(item: Record<string, unknown>): { id: string; name: string } | null {
  const itemId = typeof item.id === "string" ? item.id.trim() : "";
  if (!itemId) return null;
  const itemName =
    typeof item.display_name === "string"
      ? item.display_name
      : typeof item.name === "string"
        ? item.name
        : itemId;
  return { id: itemId, name: itemName };
}

async function fetchLiveNoAuthModels(
  modelsUrl: string,
  providerId: string,
  connectionId: string,
  excludeHidden: boolean,
  chatOnly: boolean
): Promise<Response | null> {
  try {
    const liveResponse = await safeOutboundFetch(modelsUrl, {
      ...SAFE_OUTBOUND_FETCH_PRESETS.modelsDiscovery,
      guard: getProviderOutboundGuard(),
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!liveResponse.ok) return null;

    const data = await liveResponse.json();
    const liveModels: Array<{ id: string; name: string }> = (
      (data.data || data.models || []) as Array<Record<string, unknown>>
    )
      .map(toLiveModel)
      .filter((model): model is { id: string; name: string } => model !== null);
    if (liveModels.length === 0) return null;

    const selectable = filterModelsForRoute(providerId, liveModels, chatOnly);
    const visible = excludeHidden
      ? selectable.filter((model) => !getModelIsHidden(providerId, model.id))
      : selectable;
    return Response.json({
      provider: providerId,
      connectionId,
      models: visible,
      source: "upstream",
    });
  } catch {
    return null;
  }
}

export async function buildNoAuthModelsResponse(
  providerId: string,
  connectionId: string,
  excludeHidden: boolean,
  chatOnly: boolean
) {
  if (isProviderBlockedByIdOrAlias(providerId, (await getSettings()).blockedProviders)) {
    return Response.json({ error: "Provider is disabled" }, { status: 403 });
  }

  const registryEntry = getRegistryEntry(providerId);
  const modelsUrl =
    typeof registryEntry?.modelsUrl === "string" && registryEntry.modelsUrl.length > 0
      ? registryEntry.modelsUrl
      : null;
  if (modelsUrl) {
    const live = await fetchLiveNoAuthModels(
      modelsUrl,
      providerId,
      connectionId,
      excludeHidden,
      chatOnly
    );
    if (live) return live;
  }

  const catalog = mergeLocalCatalogModels(
    getModelsByProviderId(providerId) || [],
    getStaticModelsForProvider(providerId) || []
  ).map((model) => ({ id: model.id, name: model.name || model.id }));
  const selectable = filterModelsForRoute(providerId, catalog, chatOnly);
  const visible = excludeHidden
    ? selectable.filter((model) => !getModelIsHidden(providerId, model.id))
    : selectable;
  return Response.json({
    provider: providerId,
    connectionId,
    models: visible,
    source: "local_catalog",
  });
}
