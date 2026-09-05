import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { bootstrapRealtime } from "./bootstrap.js";

async function main(): Promise<void> {
  await ensureSecrets();
  process.env.SHIGUANG_GATEWAY_MANAGED_LIVE_WS = "1";

  const host = process.env.REALTIME_HOST ?? "0.0.0.0";
  const port = Number(process.env.REALTIME_PORT ?? 8790);
  const { nestApp, fastify } = await bootstrapRealtime();

  await nestApp.listen(port, host);
  fastify.log.info(`[realtime] listening on http://${host}:${port}`);
}

await main();
