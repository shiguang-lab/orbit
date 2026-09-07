import { ensureSecrets } from "@orbit/core/startup";
import { assertGatewayEntities } from "@orbit/contracts/db-schema";
import { bootstrapControlApi } from "./bootstrap.js";

async function main(): Promise<void> {
  assertGatewayEntities();
  await ensureSecrets();
  const host = process.env.CONTROL_API_HOST ?? "0.0.0.0";
  const port = Number(process.env.CONTROL_API_PORT ?? 8788);
  const { nestApp, fastify } = await bootstrapControlApi();

  await nestApp.listen(port, host);
  fastify.log.info(`[control-api] listening on http://${host}:${port}`);
}

await main();
