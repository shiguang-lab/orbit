import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** Cache management backed exclusively by the local runtime's SQLite/cache services. */
export async function cacheRoutes(app: FastifyInstance): Promise<void> {
  const runtime = async () => {
    const semantic = await import("@/lib/semanticCache");
    const db = await import("@/lib/db/semanticCache");
    const settings = await import("@/lib/db/settings");
    const reasoning = await import(("@shiguang-gateway/open-sse/services/reasoningCache.ts" + "") as string);
    return { semantic, db, settings, reasoning };
  };

  const health = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { semantic, settings } = await runtime();
      const url = new URL(request.url, "http://gateway");
      const hours = Math.min(720, Math.max(1, Number(url.searchParams.get("trendHours") || 24)));
      const [trend, metrics] = await Promise.all([settings.getCacheTrend(hours), settings.getCacheMetrics()]);
      return reply.send({ semanticCache: semantic.getCacheStats(), promptCache: metrics, trend, config: { semanticCacheEnabled: true } });
    } catch (error) { return reply.status(500).send({ error: String(error) }); }
  };
  app.get("/usage/cache-health", health);
  app.get("/analytics/cache-health", health);
  app.get("/api/usage/cache-health", health);
  app.get("/cache", health);

  app.delete("/cache", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { semantic } = await runtime();
      const url = new URL(request.url, "http://gateway");
      const model = url.searchParams.get("model");
      const signature = url.searchParams.get("signature");
      const staleMs = url.searchParams.get("staleMs");
      if ([model, signature, staleMs].filter(Boolean).length > 1) return reply.status(400).send({ error: "Only one invalidation parameter may be provided" });
      if (model) return reply.send({ ok: true, invalidated: semantic.invalidateByModel(model), scope: "model", model });
      if (signature) return reply.send({ ok: true, invalidated: semantic.invalidateBySignature(signature), scope: "signature" });
      if (staleMs) return reply.send({ ok: true, invalidated: semantic.invalidateStale(Number(staleMs)), scope: "stale" });
      return reply.send({ ok: true, cleared: semantic.clearCache(), scope: "all" });
    } catch (error) { return reply.status(500).send({ error: String(error) }); }
  });

  app.get("/cache/entries", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { db } = await runtime(); const url = new URL(request.url, "http://gateway");
      const page = Math.max(1, Number(url.searchParams.get("page") || 1)); const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
      const result = db.listSemanticCacheEntries({ page, limit, search: url.searchParams.get("search") || "", model: url.searchParams.get("model") || "", sortBy: url.searchParams.get("sortBy") || "created_at", sortOrder: url.searchParams.get("sortOrder") || "desc" });
      return reply.send({ entries: result.entries, pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) } });
    } catch (error) { return reply.status(500).send({ error: String(error) }); }
  });
  app.delete("/cache/entries", async (request: FastifyRequest, reply: FastifyReply) => {
    try { const { db } = await runtime(); const url = new URL(request.url, "http://gateway"); const signature = url.searchParams.get("signature"); const model = url.searchParams.get("model"); if (signature) return reply.send({ ok: true, ...db.deleteSemanticCacheBySignature(signature) }); if (model) return reply.send({ ok: true, ...db.deleteSemanticCacheByModel(model) }); return reply.status(400).send({ error: "Provide signature or model parameter" }); } catch (error) { return reply.status(500).send({ error: String(error) }); }
  });

  app.get("/cache/reasoning", async (request: FastifyRequest, reply: FastifyReply) => {
    try { const { reasoning } = await runtime(); const url = new URL(request.url, "http://gateway"); return reply.send({ stats: reasoning.getReasoningCacheServiceStats(), entries: reasoning.getReasoningCacheServiceEntries({ provider: url.searchParams.get("provider") || undefined, model: url.searchParams.get("model") || undefined, limit: Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50))), offset: Math.max(0, Number(url.searchParams.get("offset") || 0)) }) }); } catch (error) { return reply.status(500).send({ error: String(error) }); }
  });
  app.delete("/cache/reasoning", async (request: FastifyRequest, reply: FastifyReply) => {
    try { const { reasoning } = await runtime(); const url = new URL(request.url, "http://gateway"); const id = url.searchParams.get("toolCallId"); const provider = url.searchParams.get("provider") || undefined; const cleared = id ? reasoning.deleteReasoningCacheEntry(id) : reasoning.clearReasoningCacheAll(provider); return reply.send({ ok: true, cleared, scope: id ? "toolCallId" : provider ? "provider" : "all" }); } catch (error) { return reply.status(500).send({ error: String(error) }); }
  });
}
