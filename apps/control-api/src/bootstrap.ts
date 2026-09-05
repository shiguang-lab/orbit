import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "./app.module.js";

/** Construct the control API application with its fixed route boundary. */
export async function bootstrapControlApi() {
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
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
