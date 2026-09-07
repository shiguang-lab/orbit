import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { installRuntimePorts } from "@orbit/inference/services/dbRuntimeHooks";

/** Construct the realtime application without starting either listening socket. */
export async function bootstrapRealtime() {
  installRuntimePorts();
  const { AppModule } = await import("./app.module.js");
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });
  const nestApp = await NestFactory.create(AppModule, adapter, { bufferLogs: true });
  const fastify = nestApp.getHttpAdapter().getInstance() as FastifyInstance;
  await nestApp.init();
  nestApp.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return { nestApp, fastify };
}
