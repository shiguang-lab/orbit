import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const budgetRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/usage/budget/bulk
  app.get("/usage/budget/bulk", async (_request, reply) => {
    try {
      const { getApiKeys } = await import("@/lib/db/apiKeys");
      const { getCostSummary, checkBudget } = await import("@/domain/costRules");

      const keys = (await getApiKeys()) as any[];
      const budgets: Record<string, any> = {};

      for (const k of keys) {
        const id = k?.id;
        if (typeof id !== "string" || !id) continue;
        const summary = getCostSummary(id);
        budgets[id] = { ...summary, budgetCheck: checkBudget(id) };
      }

      return reply.send({ budgets });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch bulk budget summary" });
    }
  });

  // GET /api/usage/budget
  app.get("/usage/budget", async (request, reply) => {
    try {
      const { apiKeyId } = (request.query as { apiKeyId?: string }) || {};
      if (!apiKeyId) {
        return reply.status(400).send({ error: "apiKeyId query param is required" });
      }

      const { getCostSummary, checkBudget } = await import("@/domain/costRules");
      const summary = getCostSummary(apiKeyId);
      const budgetCheck = checkBudget(apiKeyId);

      return reply.send({
        ...summary,
        budgetCheck,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch budget summary" });
    }
  });

  // POST /api/usage/budget
  app.post("/usage/budget", async (request, reply) => {
    try {
      const body = request.body as any;
      const {
        apiKeyId,
        dailyLimitUsd,
        weeklyLimitUsd,
        monthlyLimitUsd,
        warningThreshold,
        resetInterval,
        resetTime,
      } = body || {};

      if (!apiKeyId) {
        return reply.status(400).send({ error: "apiKeyId is required" });
      }

      const { setBudget } = await import("@/domain/costRules");
      const budget = setBudget(apiKeyId, {
        dailyLimitUsd: typeof dailyLimitUsd === "number" ? dailyLimitUsd : undefined,
        weeklyLimitUsd: typeof weeklyLimitUsd === "number" ? weeklyLimitUsd : undefined,
        monthlyLimitUsd: typeof monthlyLimitUsd === "number" ? monthlyLimitUsd : undefined,
        warningThreshold: typeof warningThreshold === "number" ? warningThreshold : undefined,
        resetInterval,
        resetTime,
      });

      return reply.send({ success: true, apiKeyId, budget });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to set budget" });
    }
  });

  // DELETE /api/usage/budget
  app.delete("/usage/budget", async (request, reply) => {
    try {
      const { apiKeyId } = (request.query as { apiKeyId?: string }) || (request.body as any) || {};
      if (!apiKeyId) {
        return reply.status(400).send({ error: "apiKeyId is required" });
      }
      const { deleteBudget } = await import("@/domain/costRules");
      deleteBudget(apiKeyId);
      return reply.send({ success: true, apiKeyId });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to delete budget" });
    }
  });
};
