/** Control-plane contract for the optional Headroom proxy lifecycle. */
export {
  DEFAULT_HEADROOM_URL,
  getHeadroomStatus,
  isLoopbackHeadroomUrl,
  parsePortFromHeadroomUrl,
} from "../lib/headroom/detect.ts";
export {
  getManagedPid,
  startHeadroomProxy,
  stopHeadroomProxy,
  HeadroomError,
} from "../lib/headroom/process.ts";
export { getCachedSettings } from "../lib/db/settings.ts";
export type { HeadroomStatus } from "../lib/headroom/detect.ts";
export type { StartResult, StopResult } from "../lib/headroom/process.ts";
