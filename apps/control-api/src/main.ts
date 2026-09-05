import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { bootstrapControlApi } from "./bootstrap.js";

async function main(): Promise<void> {
  await ensureSecrets();
  const host = process.env.CONTROL_API_HOST ?? "0.0.0.0";
  const port = Number(process.env.CONTROL_API_PORT ?? 8788);
  const { nestApp, fastify } = await bootstrapControlApi();

  await nestApp.listen(port, host);
  fastify.log.info(`[control-api] listening on http://${host}:${port}`);
}

await main();
