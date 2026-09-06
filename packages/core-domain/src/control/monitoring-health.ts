import { getCachedSettings, getProviderConnections } from "../lib/localDb.ts";
import { readRunningBuildSha } from "../lib/monitoring/buildSha.ts";
import { buildHealthPayload } from "../lib/monitoring/observability.ts";
import { APP_CONFIG } from "../shared/constants/config.ts";
import { AI_PROVIDERS } from "../shared/constants/providers.ts";

const FALLBACK_QUOTA_MONITOR_SUMMARY = {
  active: 0,
  alerting: 0,
  exhausted: 0,
  errors: 0,
  statusCounts: { starting: 0, idle: 0, healthy: 0, warning: 0, exhausted: 0, error: 0 },
  byProvider: {},
};

function readHealthValue<T>(label: string, reader: () => T, fallback: T): T {
  try {
    return reader();
  } catch (error) {
    console.warn(
      `[monitoring-health] ${label} unavailable:`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

/** Build the management health snapshot without coupling the domain to HTTP. */
export async function buildMonitoringHealthSnapshot(): Promise<unknown> {
  const [
    circuitBreakerModule,
    rateLimitModule,
    accountFallbackModule,
    requestDedupModule,
    quotaMonitorModule,
    sessionManagerModule,
    credentialHealthModule,
    localHealthModule,
    adaptiveAdmissionModule,
    chatAdmissionModule,
    settingsResult,
    connectionsResult,
  ] = await Promise.allSettled([
    import("../shared/utils/circuitBreaker.ts"),
    import("../../../open-sse/services/rateLimitManager.ts"),
    import("../../../open-sse/services/accountFallback.ts"),
    import("../../../open-sse/services/requestDedup.ts"),
    import("../../../open-sse/services/quotaMonitor.ts"),
    import("../../../open-sse/services/sessionManager.ts"),
    import("../lib/credentialHealth/cache.ts"),
    import("../lib/localHealthCheck.ts"),
    import("../../../open-sse/services/admission/runtime.ts"),
    import("../shared/middleware/chatBodyAdmission.ts"),
    getCachedSettings(),
    getProviderConnections(),
  ]);

  const circuitBreakers = circuitBreakerModule.status === "fulfilled"
    ? readHealthValue("circuit breakers", () => circuitBreakerModule.value.getAllCircuitBreakerStatuses(), [])
    : [];
  const rateLimitStatus = rateLimitModule.status === "fulfilled"
    ? readHealthValue("rate limits", () => rateLimitModule.value.getAllRateLimitStatus(), {})
    : {};
  const learnedLimits = rateLimitModule.status === "fulfilled"
    ? readHealthValue("learned limits", () => rateLimitModule.value.getLearnedLimits(), {})
    : {};
  const lockouts = accountFallbackModule.status === "fulfilled"
    ? readHealthValue("model lockouts", () => accountFallbackModule.value.getAllModelLockouts(), [])
    : [];
  const quotaMonitorSummary = quotaMonitorModule.status === "fulfilled"
    ? readHealthValue(
        "quota monitor summary",
        () => quotaMonitorModule.value.getQuotaMonitorSummary(),
        FALLBACK_QUOTA_MONITOR_SUMMARY,
      )
    : FALLBACK_QUOTA_MONITOR_SUMMARY;
  const quotaMonitorMonitors = quotaMonitorModule.status === "fulfilled"
    ? readHealthValue("quota monitor snapshots", () => quotaMonitorModule.value.getQuotaMonitorSnapshots(), [])
    : [];
  const activeSessions = sessionManagerModule.status === "fulfilled"
    ? readHealthValue("active sessions", () => sessionManagerModule.value.getActiveSessions(), [])
    : [];
  const activeSessionsByKey = sessionManagerModule.status === "fulfilled"
    ? readHealthValue("active sessions by key", () => sessionManagerModule.value.getAllActiveSessionCountsByKey(), {})
    : {};
  const credentialHealth = credentialHealthModule.status === "fulfilled"
    ? readHealthValue("credential health", () => credentialHealthModule.value.getCredentialHealthSummary(), undefined)
    : undefined;
  const localProviders = localHealthModule.status === "fulfilled"
    ? readHealthValue("local providers", () => localHealthModule.value.getAllHealthStatuses(), {})
    : {};
  const adaptiveAdmission = adaptiveAdmissionModule.status === "fulfilled"
    ? readHealthValue("adaptive admission", () => adaptiveAdmissionModule.value.getAdaptiveAdmissionRuntime().snapshot(), null)
    : null;
  const chatAdmission = chatAdmissionModule.status === "fulfilled"
    ? readHealthValue("chat admission", () => chatAdmissionModule.value.perConnectionAdmissionController.snapshot(), null)
    : null;

  return buildHealthPayload({
    appVersion: APP_CONFIG.version,
    buildSha: readRunningBuildSha(),
    catalogCount: Object.keys(AI_PROVIDERS).length,
    settings: settingsResult.status === "fulfilled" ? settingsResult.value : {},
    connections: connectionsResult.status === "fulfilled" ? connectionsResult.value : [],
    circuitBreakers,
    rateLimitStatus,
    learnedLimits,
    lockouts,
    localProviders,
    inflightRequests: requestDedupModule.status === "fulfilled"
      ? readHealthValue("inflight requests", () => requestDedupModule.value.getInflightCount(), 0)
      : 0,
    quotaMonitorSummary,
    quotaMonitorMonitors,
    activeSessions,
    activeSessionsByKey,
    credentialHealth,
    adaptiveAdmission,
    chatAdmission,
  });
}

export async function resetMonitoringCircuitBreakers(): Promise<number> {
  const { getAllCircuitBreakerStatuses, resetAllCircuitBreakers } = await import(
    "../shared/utils/circuitBreaker.ts"
  );
  const count = getAllCircuitBreakerStatuses().length;
  resetAllCircuitBreakers();
  return count;
}

export const EMPTY_MONITORING_HEALTH_SNAPSHOT = {
  status: "degraded",
  error: "Health check partially unavailable",
  providerBreakers: [],
  providerHealth: {},
  rateLimitStatus: {},
  learnedLimits: {},
  lockouts: [],
  quotaMonitor: { ...FALLBACK_QUOTA_MONITOR_SUMMARY, monitors: [] },
  sessions: { activeCount: 0, stickyBoundCount: 0, byApiKey: {}, top: [] },
  adaptiveAdmission: null,
  chatAdmission: null,
  dedup: { inflightRequests: 0 },
};
