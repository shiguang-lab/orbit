import { Injectable } from "@nestjs/common";
import {
  buildMonitoringHealthSnapshot,
  EMPTY_MONITORING_HEALTH_SNAPSHOT,
  resetMonitoringCircuitBreakers,
} from "@shiguang-gateway/core-domain/control/monitoring-health";

const HEALTH_PAYLOAD_TTL_MS = 1_000;

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

  async read(fullView: boolean): Promise<Response> {
    const now = Date.now();
    if (this.cache && now <= this.cache.expiresAt) {
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
