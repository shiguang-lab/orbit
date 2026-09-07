/** Cross-application egress diagnostics and proxy-pool validation capabilities. */
export {
  diagnoseAllEgressIps,
  getRecentEgressSharingSummary,
  validateProxyPool,
} from "../lib/proxyEgress.js";
export type { EgressSharingSummary, EgressSharingWarning } from "../lib/proxyEgress.js";
