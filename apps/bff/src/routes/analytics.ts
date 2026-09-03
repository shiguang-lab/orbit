import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AnalyticsEngine {
  getSearchAnalytics?: () => Promise<unknown>;
  getProviderStats?: () => Promise<unknown>;
  getComboHealthDashboard?: (query: {
    range?: "1h" | "24h" | "7d" | "30d";
    horizon?: "24h" | "7d" | "30d";
    comboId?: string;
    taskType?: string;
  }) => Promise<unknown>;
  getUtilization?: (query: {
    range: "1h" | "24h" | "7d" | "30d";
    provider?: string;
    aggregateBy?: "provider" | "connection";
  }) => Promise<unknown>;
}

export async function analyticsRoutes(
  app: FastifyInstance,
  opts: { engine?: AnalyticsEngine } = {},
): Promise<void> {
  const handleSearch = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!opts.engine?.getSearchAnalytics) {
        return reply.status(200).send({
          total: 0,
          today: 0,
          cached: 0,
          errors: 0,
          totalCostUsd: 0,
          byProvider: {},
          cacheHitRate: 0,
          avgDurationMs: 0,
          last24h: [],
        });
      }
      const data = await opts.engine.getSearchAnalytics();
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch search analytics" });
    }
  };

  app.get("/v1/search/analytics", handleSearch);
  app.get("/analytics/search", handleSearch);

  app.get("/provider-stats", async (_request, reply) => {
    try {
      if (!opts.engine?.getProviderStats) {
        return reply.status(200).send({
          providers: [],
          models: [],
          comboMetrics: {},
          telemetry: {},
          toolLatency: {},
        });
      }
      const data = await opts.engine.getProviderStats();
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider stats" });
    }
  });

  app.get("/usage/combo-health-dashboard", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const range = (url.searchParams.get("range") || "24h") as "1h" | "24h" | "7d" | "30d";
      const horizon = (url.searchParams.get("horizon") || "30d") as "24h" | "7d" | "30d";
      const comboId = url.searchParams.get("comboId") || undefined;
      const taskType = url.searchParams.get("taskType") || undefined;

      if (!opts.engine?.getComboHealthDashboard) {
        return reply.status(503).send({ error: "Combo health engine unavailable" });
      }
      const data = await opts.engine.getComboHealthDashboard({ range, horizon, comboId, taskType });
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combo health dashboard" });
    }
  });

  app.get("/usage/utilization", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const range = (url.searchParams.get("range") || "24h") as "1h" | "24h" | "7d" | "30d";
      const provider = url.searchParams.get("provider") || undefined;
      const aggregateBy = (url.searchParams.get("aggregateBy") || "provider") as "provider" | "connection";

      if (!opts.engine?.getUtilization) {
        return reply.status(503).send({ error: "Utilization engine unavailable" });
      }
      const data = await opts.engine.getUtilization({ range, provider, aggregateBy });
      return reply.status(200).send(data);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch utilization" });
    }
  });
}
