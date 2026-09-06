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
  setHttpProxyHandle,
  getSystemProxyState,
  setSystemProxyApplied,
  clearSystemProxy,
  isTlsInterceptEnabled,
  setTlsIntercept,
} from "./captureState.ts";
export { startHttpProxyServer } from "../../mitm/inspector/httpProxyServer.ts";
export { apply, revert } from "../../mitm/inspector/systemProxyConfig.ts";
export { globalTrafficBuffer } from "../../mitm/inspector/buffer.ts";
export { toHar } from "./harExport.ts";
export { getCachedPassword } from "../../mitm/manager.ts";
export { addDNSEntries, removeDNSEntries } from "../../mitm/dns/dnsConfig.ts";
export { maskSecret } from "../../mitm/maskSecrets.ts";
export { sanitizeHeaders } from "../../mitm/sanitizeHeaders.ts";
export { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
export { getIngestTokenForBootstrap } from "./ingestToken.ts";
export {
  InspectorCustomHostSchema,
  InspectorSessionStartSchema,
  InspectorSessionPatchSchema,
  InspectorSessionRequestAppendSchema,
  InspectorListQuerySchema,
  InspectorCaptureModeActionSchema,
  InspectorSystemProxyActionSchema,
  InspectorTlsInterceptToggleSchema,
  InspectorAnnotationPutSchema,
} from "../../shared/schemas/inspector.ts";
export { InterceptedRequestSchema } from "../../mitm/inspector/types.ts";
export type { ListFilters, InterceptedRequest } from "../../mitm/inspector/types.ts";
