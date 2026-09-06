/** Domain and persistence capabilities used by worker-owned auxiliary schedulers. */
export { getSettings, resolveProxyForConnection } from "../lib/db/settings.js";
export {
  getProviderConnections,
  updateProviderConnection,
} from "../lib/db/providers.js";
export { isConnectionUnavailableToAuxiliaryActivity } from "../lib/exclusiveLeaseIsolation.js";
export { getCircuitBreaker } from "../shared/utils/circuitBreaker.js";
export { matchesCron } from "../lib/jobs/cronMatch.js";
export { TERMINAL_CONNECTION_STATUSES } from "../lib/quota/connectionRecovery.js";
export {
  getConnectionRuntimeState,
  upsertWarmupState,
  upsertWarmupCircuit,
  clearWarmupCircuit,
  markForbidden,
} from "../lib/db/connectionRuntimeState.js";
