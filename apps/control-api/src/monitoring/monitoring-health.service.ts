import { Injectable } from "@nestjs/common";
import { getCachedSettings } from "@shiguang-gateway/core-domain/db/local-db";
import { getProviderConnections } from "@shiguang-gateway/core-domain/db/provider-connections";
import { readRunningBuildSha } from "./build-sha.js";
import { buildHealthPayload } from "@shiguang-gateway/core-domain/metrics/observability";
import { APP_CONFIG } from "@shiguang-gateway/core-domain/shared/app-config";
import { AI_PROVIDERS } from "@shiguang-gateway/core-domain/catalog/providers";
import {
  createCodexAccountPool,
  getCodexParentAccountDiagnostic,
} from "@shiguang-gateway/open-sse/services/codexAccount/index";
import { LocalProviderHealthService } from "./local-provider-health.service.js";

const HEALTH_PAYLOAD_TTL_MS = 1_000;

const FALLBACK_QUOTA_MONITOR_SUMMARY = {
  active: 0,
  alerting: 0,
  exhausted: 0,
  errors: 0,
  statusCounts: { starting: 0, idle: 0, healthy: 0, warning: 0, exhausted: 0, error: 0 },
  byProvider: {},
};

const EMPTY_MONITORING_HEALTH_SNAPSHOT = {
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

async function buildMonitoringHealthSnapshot(localProviders: Record<string, unknown>): Promise<unknown> {
  const [
    circuitBreakerModule,
    rateLimitModule,
    accountFallbackModule,
    requestDedupModule,
    quotaMonitorModule,
    sessionManagerModule,
    credentialHealthModule,
    adaptiveAdmissionModule,
    chatAdmissionModule,
    settingsResult,
    connectionsResult,
  ] = await Promise.allSettled([
    import("@shiguang-gateway/core-domain/resilience/circuit-breaker"),
    import("@shiguang-gateway/open-sse/services/rateLimitManager"),
    import("@shiguang-gateway/open-sse/services/accountFallback"),
    import("@shiguang-gateway/open-sse/services/requestDedup"),
    import("@shiguang-gateway/open-sse/services/quotaMonitor"),
    import("@shiguang-gateway/open-sse/services/sessionManager"),
    import("@shiguang-gateway/core-domain/resilience/credential-health-cache"),
    import("@shiguang-gateway/open-sse/services/admission/runtime"),
    import("@shiguang-gateway/core-domain/shared/middleware/chatBodyAdmission"),
    getCachedSettings(),
    getProviderConnections(),
  ]);
  return buildHealthPayload({
    appVersion: APP_CONFIG.version,
    buildSha: readRunningBuildSha(),
    catalogCount: Object.keys(AI_PROVIDERS).length,
    settings: settingsResult.status === "fulfilled" ? settingsResult.value : {},
    connections: connectionsResult.status === "fulfilled" ? connectionsResult.value : [],
    circuitBreakers: circuitBreakerModule.status === "fulfilled"
      ? readHealthValue("circuit breakers", () => circuitBreakerModule.value.getAllCircuitBreakerStatuses(), [])
      : [],
    rateLimitStatus: rateLimitModule.status === "fulfilled"
      ? readHealthValue("rate limits", () => rateLimitModule.value.getAllRateLimitStatus(), {})
      : {},
    learnedLimits: rateLimitModule.status === "fulfilled"
      ? readHealthValue("learned limits", () => rateLimitModule.value.getLearnedLimits(), {})
      : {},
    lockouts: accountFallbackModule.status === "fulfilled"
      ? readHealthValue("model lockouts", () => accountFallbackModule.value.getAllModelLockouts(), [])
      : [],
    localProviders,
    inflightRequests: requestDedupModule.status === "fulfilled"
      ? readHealthValue("inflight requests", () => requestDedupModule.value.getInflightCount(), 0)
      : 0,
    quotaMonitorSummary: quotaMonitorModule.status === "fulfilled"
      ? readHealthValue("quota monitor summary", () => quotaMonitorModule.value.getQuotaMonitorSummary(), FALLBACK_QUOTA_MONITOR_SUMMARY)
      : FALLBACK_QUOTA_MONITOR_SUMMARY,
    quotaMonitorMonitors: quotaMonitorModule.status === "fulfilled"
      ? readHealthValue("quota monitor snapshots", () => quotaMonitorModule.value.getQuotaMonitorSnapshots(), [])
      : [],
    activeSessions: sessionManagerModule.status === "fulfilled"
      ? readHealthValue("active sessions", () => sessionManagerModule.value.getActiveSessions(), [])
      : [],
    activeSessionsByKey: sessionManagerModule.status === "fulfilled"
      ? readHealthValue("active sessions by key", () => sessionManagerModule.value.getAllActiveSessionCountsByKey(), {})
      : {},
    credentialHealth: credentialHealthModule.status === "fulfilled"
      ? readHealthValue("credential health", () => credentialHealthModule.value.getCredentialHealthSummary(), undefined)
      : undefined,
    adaptiveAdmission: adaptiveAdmissionModule.status === "fulfilled"
      ? readHealthValue("adaptive admission", () => adaptiveAdmissionModule.value.getAdaptiveAdmissionRuntime().snapshot(), null)
      : null,
    chatAdmission: chatAdmissionModule.status === "fulfilled"
      ? readHealthValue("chat admission", () => chatAdmissionModule.value.perConnectionAdmissionController.snapshot(), null)
      : null,
    getCodexAccountDiagnostic: (
      connection: Parameters<typeof createCodexAccountPool>[0],
      nowMs: number,
    ) =>
      getCodexParentAccountDiagnostic(createCodexAccountPool(connection), nowMs),
  });
}

async function resetMonitoringCircuitBreakers(): Promise<number> {
  const { getAllCircuitBreakerStatuses, resetAllCircuitBreakers } = await import(
    "@shiguang-gateway/core-domain/resilience/circuit-breaker"
  );
  const count = getAllCircuitBreakerStatuses().length;
  resetAllCircuitBreakers();
  return count;
}

function publicHealthView(payload: unknown): Record<string, unknown> {
  const value = (payload ?? {}) as Record<string, unknown>;
  return {
    status: value.status ?? "unknown",
    ...(value.setupComplete !== undefined ? { setupComplete: value.setupComplete } : {}),
  };
}

@Injectable()
export class MonitoringHealthService {
  private cache: { payload: unknown; expiresAt: number } | null = null;

  constructor(private readonly localProviderHealth: LocalProviderHealthService) {}

  async read(fullView: boolean): Promise<Response> {
    const now = Date.now();
    if (this.cache && now <= this.cache.expiresAt) {
      return Response.json(fullView ? this.cache.payload : publicHealthView(this.cache.payload));
    }

    try {
      const payload = await buildMonitoringHealthSnapshot(this.localProviderHealth.getAllHealthStatuses());
      this.cache = { payload, expiresAt: Date.now() + HEALTH_PAYLOAD_TTL_MS };
      return Response.json(fullView ? payload : publicHealthView(payload));
    } catch (error) {
      console.error("[API] GET /api/monitoring/health error:", error);
      const payload = { ...EMPTY_MONITORING_HEALTH_SNAPSHOT, timestamp: new Date().toISOString() };
      return Response.json(fullView ? payload : publicHealthView(payload));
    }
  }

  async reset(): Promise<Response> {
    try {
      const resetCount = await resetMonitoringCircuitBreakers();
      this.cache = null;
      return Response.json({
        success: true,
        message: `Reset ${resetCount} circuit breaker(s) to healthy state`,
        resetCount,
      });
    } catch (error) {
      console.error("[API] DELETE /api/monitoring/health error:", error);
      return Response.json({ error: "Failed to reset circuit breakers" }, { status: 500 });
    }
  }
}
