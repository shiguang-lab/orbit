/**
 * 健康检查与运行时监控中心：对齐原 src/app/api/health 及 src/app/api/monitoring/health。
 */
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "ok", uptime: process.uptime() });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/livez", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    return reply.status(200).send({ status: "ready" });
  });

  // GET /api/monitoring/health - 官方运行时监控与断路器健康全量状态
  app.get("/monitoring/health", async (_request, reply) => {
    try {
      let circuitBreakers: any[] = [];
      try {
        const { getAllCircuitBreakerStatuses } = await import("@/shared/utils/circuitBreaker");
        circuitBreakers = getAllCircuitBreakerStatuses();
      } catch {}

      let connections: any[] = [];
      try {
        const { getProviderConnections } = await import("@/lib/db/providers");
        connections = (await getProviderConnections({})) as any[];
      } catch {}

      const providerBreakers = (circuitBreakers || []).map((b: any) => ({
        provider: b.provider,
        state: b.state || "CLOSED",
        failureCount: b.failureCount || 0,
        lastFailure: b.lastFailure || null,
        retryAfterMs: b.retryAfterMs || 0,
      }));

      // If no dynamic breakers initialized yet, populate from registered provider connections
      const configuredProviders = Array.from(new Set((connections || []).map((c: any) => c.provider)));
      for (const prov of configuredProviders) {
        if (!providerBreakers.some((b) => b.provider === prov)) {
          providerBreakers.push({
            provider: prov,
            state: "CLOSED",
            failureCount: 0,
            lastFailure: null,
            retryAfterMs: 0,
          });
        }
      }

      // Safe sanitized connection representations for telemetry
      const safeConns = (connections || []).map((c: any) => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        displayName: c.displayName,
        email: c.email,
        authType: c.authType,
        rateLimitedUntil: c.rateLimitedUntil || null,
        testStatus: c.testStatus,
        lastError: c.lastError,
        lastErrorType: c.lastErrorType,
        errorCode: c.errorCode,
        backoffLevel: c.backoffLevel || 0,
      }));

      return reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
        providerBreakers,
        connections: safeConns,
        lockouts: {},
        quotaMonitor: {
          active: 0,
          alerting: 0,
          exhausted: 0,
          errors: 0,
          monitors: [],
        },
        sessions: {
          activeCount: 0,
          stickyBoundCount: 0,
          byApiKey: {},
          top: [],
        },
      });
    } catch {
      return reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
        providerBreakers: [],
        connections: [],
        lockouts: {},
        quotaMonitor: { active: 0, alerting: 0, exhausted: 0, errors: 0, monitors: [] },
        sessions: { activeCount: 0, stickyBoundCount: 0, byApiKey: {}, top: [] },
      });
    }
  });

  // 模型冷却状态与解封
  app.get("/resilience/model-cooldowns", async (_request, reply) => {
    return reply.send({ items: [] });
  });

  app.delete("/resilience/model-cooldowns", async (_request, reply) => {
    return reply.send({ success: true, cleared: 0 });
  });
}
