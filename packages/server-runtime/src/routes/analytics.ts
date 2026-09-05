import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AnalyticsEngine {
  getSearchAnalytics?: () => Promise<unknown>;
  getProviderStats?: () => Promise<unknown>;
  getComboHealthDashboard?: (query: { range?: "1h" | "24h" | "7d" | "30d"; horizon?: "24h" | "7d" | "30d"; comboId?: string; taskType?: string }) => Promise<unknown>;
  getUtilization?: (query: { range: "1h" | "24h" | "7d" | "30d"; provider?: string; aggregateBy?: "provider" | "connection" }) => Promise<unknown>;
  getUsageAnalytics?: (query: { range?: string; presets?: string; startDate?: string; endDate?: string; apiKeyIds?: string }) => Promise<unknown>;
}

const unavailable = (reply: FastifyReply, capability: string) =>
  reply.status(503).send({ error: { type: "capability_unavailable", capability, source: "live" } });

export async function analyticsRoutes(app: FastifyInstance, opts: { engine?: AnalyticsEngine } = {}): Promise<void> {
  const engine = opts.engine;
  app.get("/v1/search/analytics", async (_request, reply) => engine?.getSearchAnalytics ? reply.send(await engine.getSearchAnalytics()) : unavailable(reply, "search_analytics"));
  app.get("/analytics/search", async (_request, reply) => engine?.getSearchAnalytics ? reply.send(await engine.getSearchAnalytics()) : unavailable(reply, "search_analytics"));
  app.get("/provider-stats", async (_request, reply) => engine?.getProviderStats ? reply.send(await engine.getProviderStats()) : unavailable(reply, "provider_stats"));

  const combo = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!engine?.getComboHealthDashboard) return unavailable(reply, "combo_health_dashboard");
    const url = new URL(request.url, "http://gateway");
    return reply.send(await engine.getComboHealthDashboard({
      range: (url.searchParams.get("range") || "24h") as "1h" | "24h" | "7d" | "30d",
      horizon: (url.searchParams.get("horizon") || "30d") as "24h" | "7d" | "30d",
      comboId: url.searchParams.get("comboId") || undefined,
      taskType: url.searchParams.get("taskType") || undefined,
    }));
  };
  app.get("/usage/combo-health-dashboard", combo);
  app.get("/analytics/combo-health-dashboard", combo);

  const utilization = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!engine?.getUtilization) return unavailable(reply, "utilization");
    const url = new URL(request.url, "http://gateway");
    return reply.send(await engine.getUtilization({
      range: (url.searchParams.get("range") || "24h") as "1h" | "24h" | "7d" | "30d",
      provider: url.searchParams.get("provider") || undefined,
      aggregateBy: (url.searchParams.get("aggregateBy") || "provider") as "provider" | "connection",
    }));
  };
  app.get("/usage/utilization", utilization);
  app.get("/analytics/utilization", utilization);

  const usage = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!engine?.getUsageAnalytics) return unavailable(reply, "usage_analytics");
    const url = new URL(request.url, "http://gateway");
    return reply.send(await engine.getUsageAnalytics({
      range: url.searchParams.get("range") || "30d",
      presets: url.searchParams.get("presets") || "1d,7d,30d",
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      apiKeyIds: url.searchParams.get("apiKeyIds") || undefined,
    }));
  };
  app.get("/usage/analytics", usage);
  app.get("/analytics/usage", usage);
}
