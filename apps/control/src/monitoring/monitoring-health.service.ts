import { Injectable } from "@nestjs/common";
import { getCachedSettings } from "@orbit/core/db/read-cache";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { readRunningBuildSha } from "./build-sha.js";
import { buildHealthPayload } from "@orbit/core/metrics/observability";
import { APP_CONFIG } from "@orbit/core/shared/app-config";
import { AI_PROVIDERS } from "@orbit/providers/catalog";
import {
  createCodexAccountPool,
  getCodexParentAccountDiagnostic,
} from "@orbit/inference/services/codexAccount/index";
import { executeEdgeRuntimeCommand, readEdgeRuntimeHealth } from "../edge-runtime/client.js";

const HEALTH_PAYLOAD_TTL_MS = 1_000;

const FALLBACK_QUOTA_MONITOR_SUMMARY = {
  active: 0,
  alerting: 0,
  exhausted: 0,
  errors: 0,
  statusCounts: { starting: 0, idle: 0, healthy: 0, warning: 0, exhausted: 0, error: 0 },
  byProvider: {},
};

type HealthPayloadInput = Parameters<typeof buildHealthPayload>[0];

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

async function buildMonitoringHealthSnapshot(): Promise<unknown> {
  const [
    runtimeResult,
    settingsResult,
    connectionsResult,
  ] = await Promise.allSettled([
    readEdgeRuntimeHealth(),
    getCachedSettings(),
    getProviderConnections(),
  ]);
  if (runtimeResult.status === "rejected") throw runtimeResult.reason;
  const runtime = runtimeResult.value;
  return buildHealthPayload({
    appVersion: APP_CONFIG.version,
    buildSha: readRunningBuildSha(),
    catalogCount: Object.keys(AI_PROVIDERS).length,
    settings: settingsResult.status === "fulfilled" ? settingsResult.value : {},
    connections: connectionsResult.status === "fulfilled" ? connectionsResult.value : [],
    circuitBreakers: runtime.circuitBreakers as HealthPayloadInput["circuitBreakers"],
    rateLimitStatus: runtime.rateLimitStatus as HealthPayloadInput["rateLimitStatus"],
    learnedLimits: runtime.learnedLimits as HealthPayloadInput["learnedLimits"],
    lockouts: runtime.lockouts as HealthPayloadInput["lockouts"],
    localProviders: runtime.localProviders,
    inflightRequests: runtime.inflightRequests,
    quotaMonitorSummary: runtime.quotaMonitorSummary as unknown as HealthPayloadInput["quotaMonitorSummary"],
    quotaMonitorMonitors: runtime.quotaMonitorMonitors as HealthPayloadInput["quotaMonitorMonitors"],
    activeSessions: runtime.activeSessions as HealthPayloadInput["activeSessions"],
    activeSessionsByKey: runtime.activeSessionsByKey as HealthPayloadInput["activeSessionsByKey"],
    credentialHealth: runtime.credentialHealth as HealthPayloadInput["credentialHealth"],
    adaptiveAdmission: runtime.adaptiveAdmission as HealthPayloadInput["adaptiveAdmission"],
    chatAdmission: runtime.chatAdmission as HealthPayloadInput["chatAdmission"],
    getCodexAccountDiagnostic: (
      connection: Parameters<typeof createCodexAccountPool>[0],
      nowMs: number,
    ) =>
      getCodexParentAccountDiagnostic(createCodexAccountPool(connection), nowMs),
  });
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
  // #12532: short-TTL cache with stale-while-revalidate. Health is a
  // frequently-polled endpoint; rebuilding it on the request path (DB reads +
  // status aggregation) shares the event loop with GET /healthz. After the
  // first fill, scrapes always receive the last payload immediately. An
  // expired entry is refreshed in the background — never by awaiting live
  // credential probes.
  private cache: { payload: unknown; expiresAt: number } | null = null;
  private refreshInFlight = false;
  private cacheGeneration = 0;

  async read(fullView: boolean): Promise<Response> {
    const now = Date.now();
    if (this.cache) {
      if (now > this.cache.expiresAt) {
        this.scheduleRefresh();
      }
      return Response.json(fullView ? this.cache.payload : publicHealthView(this.cache.payload));
    }

    try {
      const payload = await buildMonitoringHealthSnapshot();
      this.cache = { payload, expiresAt: Date.now() + HEALTH_PAYLOAD_TTL_MS };
      return Response.json(fullView ? payload : publicHealthView(payload));
    } catch (error) {
      console.error("[API] GET /api/monitoring/health error:", error);
      const payload = { ...EMPTY_MONITORING_HEALTH_SNAPSHOT, timestamp: new Date().toISOString() };
      return Response.json(fullView ? payload : publicHealthView(payload));
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshInFlight) return;
    this.refreshInFlight = true;
    const generation = this.cacheGeneration;
    setImmediate(() => {
      buildMonitoringHealthSnapshot()
        .then((payload) => {
          if (generation === this.cacheGeneration) {
            this.cache = { payload, expiresAt: Date.now() + HEALTH_PAYLOAD_TTL_MS };
          }
        })
        .catch((error) => {
          console.warn(
            "[API] GET /api/monitoring/health background refresh failed:",
            error instanceof Error ? error.message : error
          );
        })
        .finally(() => {
          this.refreshInFlight = false;
        });
    });
  }

  async reset(): Promise<Response> {
    try {
      const { resetCount } = await executeEdgeRuntimeCommand<{ resetCount: number }>({
        command: "resilience.reset",
      });
      // Bump the generation instead of nulling the cache: an in-flight
      // background refresh from before the reset must not repopulate stale
      // breaker state over the freshly-reset snapshot.
      this.cacheGeneration += 1;
      this.cache = null;
      this.refreshInFlight = false;
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
