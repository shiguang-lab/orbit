import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";

/** Construct the control API application with its fixed route boundary. */
export async function bootstrapControlApi() {
  const { AppModule } = await import("./app.module.js");
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    exposeHeadRoutes: false,
    bodyLimit: 512 * 1024 * 1024,
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
