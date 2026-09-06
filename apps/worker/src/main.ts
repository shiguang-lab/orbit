import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { installRuntimeSettingsPort } from "@shiguang-gateway/open-sse/services/runtime-settings-hooks";
import { assertGatewayEntities } from "@shiguang-gateway/db-schema";
import { bootstrapWorker } from "./bootstrap.js";

async function main(): Promise<void> {
  assertGatewayEntities();
  installRuntimeSettingsPort();
  await ensureSecrets();
  process.env.SHIGUANG_GATEWAY_BASE_URL ??= process.env.INTERNAL_BASE_URL ??
    `http://${process.env.EDGE_GATEWAY_HOST === "0.0.0.0" ? "127.0.0.1" : (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1")}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;

  await bootstrapWorker();
}

await main();
