import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { initializeUsageStorage } from "@shiguang-gateway/core-domain/startup";
import type { FastifyInstance } from "fastify";

export async function bootstrapEdgeGateway() {
  await initializeUsageStorage();
  await import("@shiguang-gateway/open-sse/services/dbRuntimeHooks");
  const { AppModule } = await import("./app.module.js");
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 512 * 1024 * 1024,
    exposeHeadRoutes: false,
  });
  const fastify = adapter.getInstance() as FastifyInstance;
  fastify.addContentTypeParser(
    "multipart/form-data",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );
  const nestApp = await NestFactory.create(AppModule, adapter, { bufferLogs: true });
  nestApp.enableCors({ origin: true, credentials: true });

  await nestApp.init();
  nestApp.enableShutdownHooks(["SIGINT", "SIGTERM"]);

  return { nestApp, fastify };
}
