/**
 * Shared embedded-service primitives used by control, edge, and streaming runtimes.
 *
 * HTTP route handlers stay in the owning app; this surface only exposes the
 * lifecycle, installer, API-key, and model-catalog capabilities.
 */
export {
  getSupervisor,
  registerSupervisor,
  unregisterSupervisor,
} from "./registry.ts";
export { ServiceSupervisor } from "./ServiceSupervisor.ts";
export {
  generateServiceApiKey,
  getOrCreateApiKey,
  maskApiKey,
} from "./apiKey.ts";
export {
  getInstalledVersion as getNineRouterInstalledVersion,
  getLatestVersion as getNineRouterLatestVersion,
  install as installNineRouter,
  resolveSpawnArgs as resolveNineRouterSpawnArgs,
  update as updateNineRouter,
} from "./installers/ninerouter.ts";
export { InstallError, SERVICE_VERSION_PATTERN } from "./installers/utils.ts";
export { getServiceModels } from "../db/serviceModels.ts";
export type { ServiceModel } from "../db/serviceModels.ts";
export { isServiceBackendPluginId } from "./serviceBackends.ts";
