/** Domain capabilities consumed by the control-api settings root endpoint. */
export {
  getSettings,
  getSettingsRevision,
  updateSettings,
  SettingsRevisionConflictError,
} from "../lib/db/settings.ts";
export { getRuntimePorts } from "../lib/runtime/ports.ts";
export { updateSettingsSchema } from "../shared/validation/settingsSchemas.ts";
export { getConsistentMachineId } from "../shared/utils/machineId.ts";
export { isFeatureFlagEnabled } from "../shared/utils/featureFlags.ts";
export { resolveModelLockoutSettings } from "../lib/resilience/modelLockoutSettings.ts";
export {
  validateProxyUrl,
  upsertUpstreamProxyConfig,
  getUpstreamProxyConfig,
} from "../lib/db/upstreamProxy.ts";
export { getProviderConnections } from "../lib/db/providers.ts";
export {
  ensurePersistentManagementPasswordHash,
  getStoredManagementPassword,
  hasManagementPasswordConfigured,
  hashManagementPassword,
  verifyManagementPassword,
} from "../lib/auth/managementPassword.ts";
export { isPaidModelTarget } from "../shared/utils/freeModels.ts";
export { getAuditRequestContext, logAuditEvent } from "../lib/compliance/index.ts";
export { isAuthRequired, isDashboardSessionAuthenticated } from "../shared/utils/apiAuth.ts";
export { isCliTokenAuthValid } from "../lib/middleware/cliTokenAuth.ts";
export { getApiKeyMetadata } from "../lib/db/apiKeys.ts";
export { getRadarAdminUrl } from "../lib/radar/links.ts";
export {
  AUTHZ_HEADER_AUTH_ID,
  AUTHZ_HEADER_AUTH_KIND,
  AUTHZ_HEADER_PEER_LOCALITY,
} from "../server/authz/headers.ts";
export { readSubjectFromHeaders } from "../server/authz/assertAuth.ts";
export { clearCliproxyapiUrlCache } from "../../../open-sse/executors/cliproxyapi.ts";
