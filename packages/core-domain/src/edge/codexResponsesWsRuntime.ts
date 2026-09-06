/**
 * Shared domain capabilities used by the edge-owned Codex Responses WebSocket bridge.
 *
 * The HTTP transport and action dispatch stay in apps/edge-gateway; this explicit
 * surface keeps the app from reaching through core-domain's internal directory tree.
 */
export { getApiKeyMetadata } from "../lib/db/apiKeys.js";
export {
  authorizeWebSocketHandshake,
  extractWsTokenFromRequest,
} from "../lib/ws/handshake.js";
export { getModelInfo } from "../sse/services/model.js";
export { resolveCcDiscoveryAliasStrip } from "../lib/ccDiscoveryAliasResolve.js";
export { getProviderCredentialsWithQuotaPreflight } from "../sse/services/auth.js";
export {
  enforceApiKeyPolicy,
  validateApiKeyRoutingTarget,
} from "../shared/utils/apiKeyPolicy.js";
export { checkAndRefreshToken } from "../sse/services/tokenRefresh.js";
export { isFeatureFlagEnabled } from "../shared/utils/featureFlags.js";
export { formatMemoryContext } from "../lib/memory/injection.js";
export { retrieveMemories } from "../lib/memory/retrieval.js";
export {
  DEFAULT_MEMORY_SETTINGS,
  getMemorySettings,
  toMemoryRetrievalConfig,
} from "../lib/memory/settings.js";
export {
  attachReasoningRuleDirective,
  applyReasoningRuleDirective,
  extractReasoningIntent,
  resolveReasoningSourceModels,
  resolveReasoningRoutingRule,
  validateCodexWsDecision,
} from "../lib/reasoningRouting/policy.js";
export { resolveRequestRoutingTags } from "../domain/tagRouter.js";
export { getComboByName } from "../lib/db/combos.js";
export { getComboModelString } from "../lib/combos/steps.js";
export {
  buildManagedLeaseErrorResponse,
  isExclusiveLeaseManagedKey,
  LeaseContextError,
} from "../sse/services/leaseContext.js";
export { saveCallLog } from "../lib/usage/callLogs.js";
export { saveRequestUsage } from "../lib/usage/usageHistory.js";
export { logProxyEvent } from "../lib/proxyLogger.js";
export {
  resolveCodexWsModelInfo,
  resolveResponsesApiModel,
} from "./codexResponsesWsModel.js";
