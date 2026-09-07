import { ensureSecrets } from "@orbit/core/startup";
import { assertGatewayEntities } from "@orbit/contracts/db-schema";
import { bootstrapRealtime } from "./bootstrap.js";

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    process.env.SG_DEV_IDENTITY = process.env.SG_DEV_IDENTITY ?? "1";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
  }
  assertGatewayEntities();
  await ensureSecrets();

  const host = process.env.REALTIME_HOST ?? "0.0.0.0";
  const port = Number(process.env.REALTIME_PORT ?? 8790);
  const { nestApp, fastify } = await bootstrapRealtime();

  await nestApp.listen(port, host);
  fastify.log.info(`[realtime] listening on http://${host}:${port}`);
}

await main();
