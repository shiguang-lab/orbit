export {
  getInstalledVersion as getNineRouterInstalledVersion,
  getLatestVersion as getNineRouterLatestVersion,
  install as installNineRouter,
  resolveSpawnArgs as resolveNineRouterSpawnArgs,
  update as updateNineRouter,
} from "../lib/services/installers/ninerouter.js";
export {
  CLIPROXY_DEFAULT_PORT,
  getInstalledVersion as getCliproxyInstalledVersion,
  getLatestVersion as getCliproxyLatestVersion,
  install as installCliproxy,
  resolveSpawnArgs as resolveCliproxySpawnArgs,
} from "../lib/services/installers/cliproxy.js";
export {
  BIFROST_DEFAULT_PORT,
  getInstalledVersion as getBifrostInstalledVersion,
  getLatestVersion as getBifrostLatestVersion,
  install as installBifrost,
  resolveSpawnArgs as resolveBifrostSpawnArgs,
  update as updateBifrost,
} from "../lib/services/installers/bifrost.js";
export { MUX_DEFAULT_PORT, resolveSpawnArgs as resolveMuxSpawnArgs } from "../lib/services/installers/mux.js";
export { DARIO_DEFAULT_PORT, resolveSpawnArgs as resolveDarioSpawnArgs } from "../lib/services/installers/dario.js";
export { InstallError, SERVICE_VERSION_PATTERN } from "../lib/services/installers/utils.js";
