/**
 * Transport-neutral Mux capabilities used by the control app.
 * HTTP controllers and route composition remain app-owned.
 */
export {
  getInstalledVersion,
  getLatestVersion,
  install as installMux,
  MUX_DEFAULT_PORT,
  resolveSpawnArgs as resolveMuxSpawnArgs,
  update,
} from "../lib/services/installers/mux.ts";
export { getOrCreateApiKey } from "../lib/services/apiKey.ts";
export { getSupervisor, registerSupervisor } from "../lib/services/registry.ts";
export { ServiceSupervisor } from "../lib/services/ServiceSupervisor.ts";
