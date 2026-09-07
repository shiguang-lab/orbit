import { ensureSecrets } from "@orbit/core/startup";
import { assertGatewayEntities } from "@orbit/contracts/db-schema";
import { bootstrapControlApi } from "./bootstrap.js";

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    process.env.SG_DEV_IDENTITY = process.env.SG_DEV_IDENTITY ?? "1";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
  }
  assertGatewayEntities();
  await ensureSecrets();
  const host = process.env.CONTROL_API_HOST ?? "0.0.0.0";
  const port = Number(process.env.CONTROL_API_PORT ?? 8788);
  const { nestApp, fastify } = await bootstrapControlApi();

  await nestApp.listen(port, host);
  fastify.log.info(`[control] listening on http://${host}:${port}`);
}

await main();
