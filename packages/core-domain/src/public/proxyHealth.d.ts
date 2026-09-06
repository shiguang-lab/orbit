export type ProxyProbeOutcome = "ok" | "fail" | "inconclusive" | "blocked";
export function classifyProbeStatus(status: number): ProxyProbeOutcome;
export function decideProxyHealthAction(input: {
  outcome: ProxyProbeOutcome;
  priorFailures: number;
  autoRemove: boolean;
  autoDisable?: boolean;
  removeAfter: number;
}): {
  failures: number;
  clearFailures: boolean;
  setStatus: "active" | "inactive" | "dead" | null;
  remove: boolean;
};
export function resolveHealthCheckStatusWrite(
  alive: boolean,
  env?: { PROXY_HEALTH_AUTO_DEACTIVATE?: string },
): "active" | "inactive" | null;
export function isProxyHealthAutoDeactivateEnabled(
  env?: { PROXY_HEALTH_AUTO_DEACTIVATE?: string },
): boolean;
export function resolveProbeConcurrency(env?: Record<string, string | undefined>): number;
export function resolveProbeStaggerMs(env?: Record<string, string | undefined>): number;
export function resolveProbeTarget(env?: Record<string, string | undefined>): string;
export function waitForProbeSlot(indexInBatch: number, stepMs: number): Promise<void>;
export function resolveProviderProbeTarget(
  proxyId: string,
  env?: Record<string, string | undefined>,
): Promise<string | null>;
