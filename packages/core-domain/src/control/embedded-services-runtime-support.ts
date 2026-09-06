/** Domain, persistence, and process primitives for worker-owned embedded-service jobs. */
export { getVersionManagerTool, updateVersionManagerTool } from "../lib/db/versionManager.js";
export { getSettings } from "../lib/db/settings.js";
export {
  getServiceModels,
  saveServiceModels,
  markAllUnavailable,
  type ServiceModel,
} from "../lib/db/serviceModels.js";
export {
  registerSupervisor,
  getSupervisor,
  stopAllSupervisors,
} from "../lib/services/registry.js";
export { ServiceSupervisor } from "../lib/services/ServiceSupervisor.js";
export { resolveSpawnArgs as resolveNineRouterSpawnArgs } from "../lib/services/installers/ninerouter.js";
export {
  resolveSpawnArgs as resolveCliproxySpawnArgs,
  CLIPROXY_DEFAULT_PORT,
} from "../lib/services/installers/cliproxy.js";
export {
  resolveSpawnArgs as resolveMuxSpawnArgs,
  MUX_DEFAULT_PORT,
} from "../lib/services/installers/mux.js";
export {
  resolveSpawnArgs as resolveBifrostSpawnArgs,
  BIFROST_DEFAULT_PORT,
} from "../lib/services/installers/bifrost.js";
export {
  resolveSpawnArgs as resolveDarioSpawnArgs,
  DARIO_DEFAULT_PORT,
} from "../lib/services/installers/dario.js";
export { getOrCreateApiKey } from "../lib/services/apiKey.js";
export type { ServiceStatus } from "../lib/services/types.js";
export { getServiceProviderPlugin } from "../lib/services/providerPlugins/registry.js";
