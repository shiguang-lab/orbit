import { registerProviderRuntimePorts } from "@orbit/core/runtime/provider-ports";
import { parseModel, resolveCanonicalProviderModel } from "./model.ts";
import { getLearnedThinkingCap } from "./learnedThinkingCaps.ts";
import { getUsageForProvider } from "./usage.ts";
import { getAntigravityQuotaFamily } from "./antigravityQuotaFamily.ts";
import { getCodexQuotaWindowFilterForModel } from "../config/codexQuotaScopes.ts";
import {
  createCodexAccountPool,
  getCodexChildQuotaHydration,
  resolveCodexAccount,
} from "./codexAccount/index.ts";
import { getOriginalFetch, runWithProxyContext } from "../utils/proxyFetch.ts";
import { getResourcePressureObservation } from "../utils/resourcePressure.ts";
import { checkTokenLimits } from "./tokenLimitCounter.ts";
import { setSystemPromptConfig } from "./systemPrompt.ts";
import { hydrateThinkingBudgetConfig } from "./thinkingBudget.ts";
import { hydrateTaskRoutingConfig } from "./taskAwareRouter.ts";
import { filterSelectableModels } from "./modelLifecycle.ts";
import { filterChatSelectableModels } from "./modelEndpointPolicy.ts";
import { isObsoleteKiroModelAlias } from "./kiroModels.ts";
import { estimateTokens } from "./contextManager.ts";
import {
  getAccessToken,
  getDeprecationNotice,
  isUnrecoverableRefreshError,
  refreshCopilotToken,
  supportsTokenRefresh,
} from "./tokenRefresh.ts";
import { isKimiTokenExpiringSoon } from "../utils/kimiJwt.ts";
import { exchangeKimiRefreshToken } from "./kimiTokenRefresh.ts";
import proxyFetch from "../utils/proxyFetch.ts";
import { clearDispatcherCache, createProxyDispatcher, proxyConfigToUrl } from "../utils/proxyDispatcher.ts";
import { rotationGroupFor } from "./refreshSerializer.ts";
import { normalizeDataUri } from "../utils/imageNormalize.ts";
import { getRegisteredProviderEffortBaseModelId } from "../utils/registeredEffortVariants.ts";
import { AUDIO_TRANSCRIPTION_PROVIDERS } from "../config/audioRegistry.ts";
import { resolveScoresAs } from "./autoCombo/scoresAs.ts";
import * as searchRegistry from "../config/searchRegistry.ts";
import { handleSearch } from "../handlers/search.ts";
import * as searchCache from "./searchCache.ts";
import * as webFetchRuntime from "../handlers/webFetch.ts";
import { reloadAdaptiveAdmissionRuntime } from "./admission/runtime.ts";
import { validateWebCookieProvider } from "./providerValidation/webCookie.ts";

let runtimePortsInstalled = false;

export function installCoreDomainRuntimePorts(): void {
  if (runtimePortsInstalled) return;
  registerProviderRuntimePorts({
  parseModel,
  resolveCanonicalProviderModel,
  getLearnedThinkingCap,
  fetchUsageWithProxy: (connection, proxy) =>
    runWithProxyContext(proxy, () => getUsageForProvider(connection as never)),
  getAntigravityQuotaFamily,
  getCodexQuotaWindowFilter: getCodexQuotaWindowFilterForModel,
  getCodexQuotaHydration(connection, requestedModel) {
    const pool = createCodexAccountPool({
      ...connection,
      providerSpecificData: connection.providerSpecificData ?? {},
    });
    const account = resolveCodexAccount(pool, requestedModel);
    if (account.kind !== "child") return null;
    const hydration = getCodexChildQuotaHydration(account);
    if (!hydration.quotaState) return null;
    return {
      scope: hydration.scope,
      quotaState: hydration.quotaState,
      exhaustedWindow: hydration.exhaustedWindow,
    };
  },
  runWithProxy: runWithProxyContext,
  getOriginalFetch,
  getPressureSeverity: () => getResourcePressureObservation().state.severity,
  checkTokenLimits,
  hydrateRoutingSettings(settings) {
    if (settings.systemPrompt) setSystemPromptConfig(settings.systemPrompt as never);
    hydrateThinkingBudgetConfig(settings as never);
    hydrateTaskRoutingConfig(settings as never);
  },
  filterSelectableModels,
  filterChatSelectableModels,
  isObsoleteKiroModelAlias,
  estimateTokens,
  probeWebCookie: validateWebCookieProvider,
  getAccessToken,
  getTokenRefreshDeprecationNotice: getDeprecationNotice,
  supportsTokenRefresh,
  isUnrecoverableRefreshError,
  refreshCopilotToken,
  isKimiTokenExpiringSoon,
  exchangeKimiRefreshToken,
  createProxyDispatcher,
  clearProxyDispatcherCache: clearDispatcherCache,
  proxyConfigToUrl,
  rotationGroupFor,
  proxyFetch: proxyFetch as typeof fetch,
  normalizeDataUri,
  getRegisteredProviderEffortBaseModelId,
  getAudioTranscriptionModels: () =>
    Object.entries(AUDIO_TRANSCRIPTION_PROVIDERS).flatMap(([providerId, provider]) =>
      provider.models.map((model) =>
        model.id.startsWith(`${providerId}/`) ? model.id : `${providerId}/${model.id}`
      )
    ),
  resolveScoresAs,
  searchRuntime: { ...searchRegistry, ...searchCache, handleSearch },
  webFetchRuntime,
  reloadAdaptiveAdmissionRuntime,
  });
  runtimePortsInstalled = true;
}
