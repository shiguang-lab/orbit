/**
 * 健康检查：对齐原 src/app/api/health/route.ts。
 * GET /api/health → 200 {status:"ok",...}
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
}
