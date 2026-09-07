/**
 * Provider connection capabilities consumed by the control-plane application.
 * HTTP routing and response orchestration remain in apps/control.
 */
export { clampLoginTimeoutMs } from "../lib/api/loginTimeout.js";
export { requireManagementAuth } from "../lib/api/requireManagementAuth.js";
export { isApiKeyRevealEnabled, maskStoredApiKey } from "../lib/apiKeyExposure.js";
export { syncToCloud } from "../lib/cloudSync.js";
export { getAuditRequestContext, logAuditEvent } from "../lib/compliance/index.js";
export {
  getProviderAuditTarget,
  summarizeProviderConnectionForAudit,
} from "../lib/compliance/providerAudit.js";
export { cleanupProviderModelsAfterConnectionDelete } from "../lib/db/models.js";
export {
  deleteProviderConnection,
  getCachedProviderConnectionById,
  isCloudEnabled,
  updateProviderConnection,
} from "../lib/localDb.js";
export { rejectRetiredCommonChatGptWebProvider } from "../lib/providers/chatgptWebRetirementResponse.js";
export {
  buildClaudeExtraUsageStateClearUpdate,
  isClaudeExtraUsageBlockEnabled,
} from "../lib/providers/claudeExtraUsage.js";
export {
  normalizeProviderSpecificData,
  sanitizeProviderSpecificDataForResponse,
} from "../lib/providers/requestDefaults.js";
export { getConsistentMachineId } from "../shared/utils/machineId.js";
export { isValidationFailure, validateBody } from "../shared/validation/helpers.js";
export { updateProviderConnectionSchema } from "../shared/validation/schemas/provider.js";
