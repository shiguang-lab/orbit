import { NestFactory } from "@nestjs/core";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "./app.module.js";

/** Create the worker's standalone Nest application context. */
export async function bootstrapWorker(): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
