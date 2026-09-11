import { installApiKeyClientPolicy } from "./common/api-key-client-policy.js";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { initializeUsageStorage } from "@orbit/core/startup";
import { initializeProxyLogStorage } from "@orbit/core/runtime/proxy-log-lifecycle";
import type { FastifyInstance } from "fastify";
import { installRuntimePorts } from "@orbit/inference/services/dbRuntimeHooks";

export async function bootstrapEdgeGateway() {
  await initializeUsageStorage();
  installRuntimePorts();
  const [{ installMemoryRuntimePort }, { installQuotaSaturationRuntimePort }] = await Promise.all([
    import("@orbit/inference/services/memoryRuntime"),
    import("@orbit/inference/services/quota-saturation"),
  ]);
  installMemoryRuntimePort();
  installQuotaSaturationRuntimePort();
  initializeProxyLogStorage();
  const { AppModule } = await import("./app.module.js");
  const adapter = new FastifyAdapter({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 512 * 1024 * 1024,
    exposeHeadRoutes: false,
    trustProxy: process.env.EDGE_TRUSTED_PROXIES?.split(",").map((ip) => ip.trim()).filter(Boolean) ?? false,
  });
  const fastify = adapter.getInstance() as FastifyInstance;
  installApiKeyClientPolicy(fastify);
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
