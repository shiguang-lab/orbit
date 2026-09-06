/**
 * Control-plane capabilities for the Traffic Inspector.
 *
 * Transport handlers live in apps/control-api; this package surface only
 * exposes the shared inspector state and persistence primitives used by the
 * control app and the edge MITM runtime.
 */
export {
  listCustomHosts,
  addCustomHost,
  removeCustomHost,
  toggleCustomHost,
} from "../db/inspectorCustomHosts.ts";
export {
  getHttpProxyHandle,
  getSystemProxyState,
  isTlsInterceptEnabled,
} from "./captureState.ts";
export { globalTrafficBuffer } from "../../mitm/inspector/buffer.ts";
export { listSessions, createSession } from "../db/inspectorSessions.ts";
export { getCachedPassword } from "../../mitm/manager.ts";
export { addDNSEntries } from "../../mitm/dns/dnsConfig.ts";
export {
  InspectorCustomHostSchema,
  InspectorSessionStartSchema,
  InspectorListQuerySchema,
} from "../../shared/schemas/inspector.ts";
export type { ListFilters } from "../../mitm/inspector/types.ts";
