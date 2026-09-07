import { ensureSecrets } from "@orbit/core/startup";
import { installRuntimeSettingsPort } from "@orbit/inference/services/runtime-settings-hooks";
import { assertGatewayEntities } from "@orbit/contracts/db-schema";
import { bootstrapWorker } from "./bootstrap.js";

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    process.env.SG_DEV_IDENTITY = process.env.SG_DEV_IDENTITY ?? "1";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
  }
  assertGatewayEntities();
  installRuntimeSettingsPort();
  await ensureSecrets();
  process.env.ORBIT_BASE_URL ??= process.env.INTERNAL_BASE_URL ??
    `http://${process.env.EDGE_GATEWAY_HOST === "0.0.0.0" ? "127.0.0.1" : (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1")}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;

  await bootstrapWorker();
}

await main();
