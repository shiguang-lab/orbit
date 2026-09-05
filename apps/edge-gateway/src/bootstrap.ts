import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "./app.module.js";

export async function bootstrapEdgeGateway() {
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 512 * 1024 * 1024,
  });
  const nestApp = await NestFactory.create(AppModule, adapter, { bufferLogs: true });
  const fastify = nestApp.getHttpAdapter().getInstance() as FastifyInstance;

  await nestApp.init();
  nestApp.enableShutdownHooks(["SIGINT", "SIGTERM"]);

  return { nestApp, fastify };
}
