import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const freeProviderRankingsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/free-provider-rankings", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const category = query.category || undefined;
      const limit = query.limit ? Math.min(Math.max(1, Number(query.limit) || 50), 100) : 50;
      const configuredOnly = query.configuredOnly === "1" || query.configuredOnly === "true";
      const availableOnly = query.availableOnly === "1" || query.availableOnly === "true";
      const withUsage = query.withUsage === "1" || query.withUsage === "true";
      const usageRange = (query.usageRange as any) || "24h";

      const { computeFreeProviderRankings } = await import("@/lib/freeProviderRankings");
      const rankings = await computeFreeProviderRankings(category, limit, {
        configuredOnly,
        availableOnly,
        withUsage,
        usageRange,
      });

      return reply.send({ rankings: rankings || [] });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to compute free provider rankings" });
    }
  });
};
