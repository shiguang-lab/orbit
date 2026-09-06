/**
 * Transport-neutral version manager primitives used by control-plane apps.
 *
 * HTTP controllers stay in the owning app; this module only exposes the
 * persistence, installer and supervisor services needed to implement them.
 */

export {
  getServiceRow,
  getVersionManagerStatus,
} from "../db/versionManager.ts";
export { getSupervisor, registerSupervisor } from "../services/registry.ts";
export { ServiceSupervisor } from "../services/ServiceSupervisor.ts";
export { getOrCreateApiKey } from "../services/apiKey.ts";
export {
  CLIPROXY_DEFAULT_PORT,
  getInstalledVersion,
  getLatestVersion,
  install,
  resolveSpawnArgs,
} from "../services/installers/cliproxy.ts";

export {
  BIFROST_DEFAULT_PORT,
  getInstalledVersion as getBifrostInstalledVersion,
  getLatestVersion as getBifrostLatestVersion,
  install as installBifrost,
  resolveSpawnArgs as resolveBifrostSpawnArgs,
  update as updateBifrost,
} from "../services/installers/bifrost.ts";

export { updateServiceField } from "../db/versionManager.ts";
