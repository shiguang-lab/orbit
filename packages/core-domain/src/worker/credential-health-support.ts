/** Domain state used by the worker-owned credential-health scheduler. */
export { getProviderConnections } from "../lib/localDb.js";
export {
  setCredentialHealth,
  removeCredentialHealth,
  initCredentialCache,
  getCredentialHealth,
} from "../lib/credentialHealth/cache.js";
export {
  isCredentialProbeInconclusive,
  resolveInconclusiveProbeRecheckDelayMs,
} from "../lib/credentialHealth/probePolicy.js";
export { emit } from "../lib/events/eventBus.js";
export { isAutomatedTestProcess } from "../shared/utils/testProcess.js";
