/**
 * Cross-application proxy health capabilities.
 *
 * The control API uses these primitives for its operator-triggered probe, while
 * the worker uses the same policies for the background sweep. Keep this module
 * transport-neutral; HTTP concerns belong to the owning app.
 */
export { classifyProbeStatus } from "../lib/proxyHealth/decision.js";
export {
  resolveHealthCheckStatusWrite,
  isProxyHealthAutoDeactivateEnabled,
} from "../lib/proxyHealth/statusPolicy.js";
export {
  resolveProbeConcurrency,
  resolveProbeStaggerMs,
  resolveProbeTarget,
  waitForProbeSlot,
} from "../lib/proxyHealth/probeTarget.js";
export { resolveProviderProbeTarget } from "../lib/proxyHealth/providerProbeTarget.js";
