import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const freeTierRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/free-tier/summary", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const excludeTosAvoid = query.excludeTosAvoid === "1" || query.excludeTosAvoid === "true";

      const { computeFreeModelTotals } = await import("@omniroute/open-sse/config/freeModelCatalog");
      const { FREE_CATALOG_CURATED_AT } = await import("@omniroute/open-sse/config/freeModelCatalog.data");
      const { sumUsageTokensThisMonth } = await import("@/lib/db/usageSummary");
      const { listNoCredentialProviders } = await import("@/shared/utils/providerCredentialRequirement");

      const totals = computeFreeModelTotals({ excludeTosAvoid });
      let usedThisMonth = 0;
      try {
        usedThisMonth = sumUsageTokensThisMonth();
      } catch {}

      let noCredentialProviders: string[] = [];
      try {
        noCredentialProviders = listNoCredentialProviders();
      } catch {}

      const body = {
        ...totals,
        usedThisMonth,
        remaining: Math.max(0, totals.steadyRecurringTokens - usedThisMonth),
        catalogUpdatedAt: FREE_CATALOG_CURATED_AT,
        catalogSource: "baseline" as const,
        noCredentialProviders,
      };

      return reply.send(body);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch free tier summary" });
    }
  });
};
