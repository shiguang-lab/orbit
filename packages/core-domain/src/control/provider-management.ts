/**
 * Public provider-management capability surface for control-api.
 *
 * The HTTP transport lives in apps/control-api; this facade keeps the app
 * from reaching into core-domain implementation paths while preserving the
 * provider connection/domain contracts used by the management handlers.
 */
export { getAuditRequestContext, logAuditEvent } from "../lib/compliance/index.js";
export {
  getProviderAuditTarget,
  summarizeProviderConnectionForAudit,
} from "../lib/compliance/providerAudit.js";
export { syncToCloud } from "../lib/cloudSync.js";
export { isManagedProviderConnectionId } from "../lib/providers/catalog.js";
export {
  normalizeProviderSpecificData,
  sanitizeProviderSpecificDataForResponse,
} from "../lib/providers/requestDefaults.js";
export { rejectRetiredCommonChatGptWebProvider } from "../lib/providers/chatgptWebRetirementResponse.js";
export { requireManagementAuth } from "../lib/api/requireManagementAuth.js";
export { isApiKeyRevealEnabled, maskStoredApiKey } from "../lib/apiKeyExposure.js";
export {
  getProviderConnections,
  getProviderConnectionsCount,
  createProviderConnection,
  deleteProviderConnections,
  updateProviderConnection,
  resolveProviderNodeForConnection,
  getProviderNodeById,
  getProxyForLevel,
  resolveProxyForProvider,
  isCloudEnabled,
} from "../lib/localDb.js";
export { cleanupProviderModelsAfterConnectionDelete } from "../lib/db/models.js";
export { isAutoFetchModelsEnabled } from "../lib/providerModels/modelDiscovery.js";
export { getQuotaWindowObservation } from "../domain/quotaCache.js";
export {
  isClaudeCodeCompatibleProvider,
  isOpenAICompatibleProvider,
  isAnthropicCompatibleProvider,
  resolveProviderId,
  supportsBulkApiKey,
} from "../shared/constants/providers.js";
export {
  buildModelSyncInternalHeaders,
  fetchModelSyncInternal,
  getModelSyncInternalBaseUrl,
} from "../shared/services/modelSyncScheduler.js";
export { getConsistentMachineId } from "../shared/utils/machineId.js";
export { resolveBulkNameCollisions } from "../shared/utils/bulkApiKeyParser.js";
export { isValidationFailure, validateBody } from "../shared/validation/helpers.js";
export {
  createProviderSchema,
  batchUpdateProviderConnectionsSchema,
  bulkCreateProviderSchema,
  bulkImportProviderSchema,
  bulkWebSessionImportSchema,
} from "../shared/validation/schemas/provider.js";
export { validateProviderApiKey } from "../lib/providers/validation.js";
