import { NestFactory } from "@nestjs/core";
import type { INestApplicationContext } from "@nestjs/common";
import { installRuntimePorts } from "@orbit/inference/services/dbRuntimeHooks";

/** Create the worker's standalone Nest application context. */
export async function bootstrapWorker(): Promise<INestApplicationContext> {
  installRuntimePorts();
  const { AppModule } = await import("./app.module.js");
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
