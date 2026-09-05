import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { registerGatewayApp, type GatewaySurface } from "./app.js";

@Module({})
class GatewayModule {}

/**
 * NestJS + Fastify bootstrap for the independent gateway.
 *
 * Nest owns the process lifecycle and Fastify is the HTTP adapter. Route
 * registration is kept in one application composition function so every
 * surface starts from the same contract and there is one bootstrap path.
 */
export async function createNestApplication(surface: GatewaySurface = "all") {
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 512 * 1024 * 1024,
  });
  const nestApp = await NestFactory.create(GatewayModule, adapter, { bufferLogs: true });
  const fastify = nestApp.getHttpAdapter().getInstance() as FastifyInstance;
  await registerGatewayApp(fastify, { surface });
  await nestApp.init();
  return { nestApp, fastify };
}
