/**
 * Node-only MITM primitives.
 *
 * HTTP transport, authentication and persisted settings remain in the owning
 * app. This export contains only process, certificate, target and host-system
 * operations that can be shared by local MITM integrations.
 */
export {
  getMitmStatus,
  getCachedPassword,
  setCachedPassword,
  startMitm,
  stopMitm,
} from "../mitm/manager.runtime.ts";
export { generateCert } from "../mitm/cert/generate.ts";
export { resolveMitmDataDir } from "../mitm/dataDir.ts";
export { isRoot } from "../mitm/systemCommands.ts";
export { ANTIGRAVITY_MITM_PROFILE } from "../mitm/targets/antigravity.ts";
export { KIRO_MITM_PROFILE } from "../mitm/targets/kiro.ts";
export type { MitmTarget } from "../mitm/types.ts";
