import { SAFE_OUTBOUND_FETCH_PRESETS, safeOutboundFetch } from "@orbit/core/network/safe-outbound-fetch";
import { getProviderOutboundGuard } from "@orbit/core/network/outbound-url-guard-policy";
import { resolveConolCredentials } from "@orbit/inference/services/conolAuth";
import {
  CONOL_FALLBACK_MODELS,
  discoverConolModels,
  type ConolModel,
} from "@orbit/inference/services/conolModels";
import { sanitizeErrorMessage } from "@orbit/utils/errors";

interface DiscoveryWarnings {
  cacheWarning?: string;
  localWarning?: string;
}

interface ConolDiscoveryRouteOptions {
  provider: string;
  connectionId: string;
  apiKey: unknown;
  accessToken: unknown;
  providerSpecificData: unknown;
  proxy: unknown;
  maybeReturnCachedDiscovery: () => Response | null;
  maybeReturnAutoFetchDisabled: () => Response | null;
  buildDiscoveryFallbackResponse: (warnings: DiscoveryWarnings) => Response | null;
  buildResponse: (payload: Record<string, unknown>) => Response;
  buildApiDiscoveryResponse: (models: ConolModel[]) => Promise<Response>;
}

export async function maybeHandleConolModelDiscovery(
  options: ConolDiscoveryRouteOptions
): Promise<Response | null> {
  if (options.provider !== "conol-web" && options.provider !== "cnl") return null;

  const cachedResponse = options.maybeReturnCachedDiscovery();
  if (cachedResponse) return cachedResponse;

  const autoFetchDisabledResponse = options.maybeReturnAutoFetchDisabled();
  if (autoFetchDisabledResponse) return autoFetchDisabledResponse;

  const { cookie } = resolveConolCredentials({
    apiKey: options.apiKey,
    accessToken: options.accessToken,
    providerSpecificData: options.providerSpecificData,
  });
  const seedModels = CONOL_FALLBACK_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    supportsVision: model.supportsVision,
    ...(model.efforts && model.efforts.length > 0
      ? { supportsThinking: true, supportedThinkingEfforts: model.efforts }
      : {}),
  }));
  if (!cookie) {
    const fallback = options.buildDiscoveryFallbackResponse({
      cacheWarning: "No Conol cookie configured — using cached catalog",
      localWarning: "No Conol cookie configured — using local catalog",
    });
    if (fallback) return fallback;
    return options.buildResponse({
      provider: options.provider,
      connectionId: options.connectionId,
      models: seedModels,
      source: "local_catalog",
      intentional: true,
      warning: "No Conol session cookie — using seed model list",
    });
  }

  try {
    const discovery = await discoverConolModels({
      cookie,
      fetchImpl: (url, init) =>
        safeOutboundFetch(url as string | URL, {
          ...SAFE_OUTBOUND_FETCH_PRESETS.modelsDiscovery,
          guard: getProviderOutboundGuard(),
          proxyConfig: options.proxy,
          ...init,
        }),
    });
    // Conol exposes its reasoning ladder as `efforts`; project the provider
    // native field onto the canonical discovery contract before persistence so
    // the shared effort/thinking aggregation and UI can consume it.
    const models = discovery.models.map((model) => ({
      ...model,
      ...(model.efforts && model.efforts.length > 0
        ? {
            supportsThinking: true,
            supportedThinkingEfforts: model.efforts,
          }
        : {}),
    }));
    return options.buildApiDiscoveryResponse(models);
  } catch (error) {
    console.log("Error fetching models from conol-web", {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : error),
    });
    const fallback = options.buildDiscoveryFallbackResponse({
      cacheWarning: "Conol model discovery failed — using cached catalog",
      localWarning: "Conol model discovery failed — using seed catalog",
    });
    if (fallback) return fallback;
    return options.buildResponse({
      provider: options.provider,
      connectionId: options.connectionId,
      models: seedModels,
      source: "local_catalog",
      intentional: true,
      warning: "API unavailable — using seed Conol model list",
    });
  }
}
