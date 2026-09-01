import type { FastifyInstance } from "fastify";

export interface HomeEngine {
  getModels?: () => Promise<unknown>;
  getProviderMetrics?: () => Promise<unknown>;
  getRecentCallLogs?: (options: { limit: number; excludeTests: boolean }) => Promise<unknown>;
  getVersion?: () => Promise<unknown>;
}

/** Dashboard home projections. Each handler delegates to the existing Orbit
 * query/module and returns only the projection needed by the home page. */
export async function homeRoutes(app: FastifyInstance, opts: { engine?: HomeEngine } = {}): Promise<void> {
  app.get("/models", async (_request, reply) => {
    try { return reply.status(200).send(await opts.engine?.getModels?.() ?? { models: [] }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch models" }); }
  });
  app.get("/provider-metrics", async (_request, reply) => {
    try { return reply.status(200).send(await opts.engine?.getProviderMetrics?.() ?? { metrics: {}, topology: {} }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch provider metrics" }); }
  });
  app.get("/usage/call-logs", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const parsed = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const limit = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 20;
      return reply.status(200).send(await opts.engine?.getRecentCallLogs?.({ limit, excludeTests: url.searchParams.get("excludeTests") === "1" }) ?? []);
    } catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch recent call logs" }); }
  });
  app.get("/system/version", async (_request, reply) => {
    try { return reply.status(200).send(await opts.engine?.getVersion?.() ?? { version: process.env.npm_package_version ?? "unknown", current: process.env.npm_package_version ?? "unknown", latest: "unknown", updateAvailable: false }); }
    catch (error) { app.log.error(error); return reply.status(500).send({ error: "Failed to fetch system version" }); }
  });
}
