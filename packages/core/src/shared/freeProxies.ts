/**
 * Cross-app free-proxy catalog contract.
 *
 * Control API owns the HTTP use cases while the worker owns the optional
 * background scheduler. The persistence/provider primitives are shared here
 * so neither app reaches through core's private source tree.
 */
export {
  clearFreeProxiesBySource,
  countFreeProxies,
  deleteFreeProxy,
  getFreeProxyById,
  getFreeProxyStats,
  getFreeProxySyncErrors,
  listFreeProxies,
  promoteFreeProxyToPool,
} from "../lib/db/freeProxies.ts";
export type {
  FreeProxyRecord,
  FreeProxyStats,
  FreeProxySyncErrors,
} from "../lib/db/freeProxies.ts";

export { getAllProviders, getEnabledProviders, getProvider } from "../lib/freeProxyProviders/index.ts";
export type {
  FreeProxyProvider,
  FreeProxySourceId,
} from "../lib/freeProxyProviders/types.ts";
export { runFreeProxySyncCycle } from "../lib/freeProxyProviders/syncCycle.ts";
export type { FreeProxySyncCycleResult } from "../lib/freeProxyProviders/syncCycle.ts";

// These helpers are intentionally side-effect free. Importing the control
// HTTP module must never start the worker's background timer.
export {
  getFreeProxyAutoSyncIntervalMs,
  isFreeProxyAutoSyncEnabled,
} from "../lib/freeProxyProviders/schedulerConfig.ts";
