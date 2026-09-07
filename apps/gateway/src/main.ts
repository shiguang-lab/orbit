import { ensureSecrets } from "@orbit/core/startup";
import { assertGatewayEntities } from "@orbit/contracts/db-schema";
import { bootstrapEdgeGateway } from "./bootstrap.js";

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    process.env.SG_DEV_IDENTITY = process.env.SG_DEV_IDENTITY ?? "1";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
  }
  assertGatewayEntities();
  await ensureSecrets();
  const host = process.env.EDGE_GATEWAY_HOST ?? "0.0.0.0";
  const port = Number(process.env.EDGE_GATEWAY_PORT ?? 8787);
  const { nestApp, fastify } = await bootstrapEdgeGateway();

  await nestApp.listen(port, host);
  fastify.log.info(`[gateway] listening on http://${host}:${port}`);
}

await main();
