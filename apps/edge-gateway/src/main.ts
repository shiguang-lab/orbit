import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { bootstrapEdgeGateway } from "./bootstrap.js";

async function main(): Promise<void> {
  await ensureSecrets();
  const host = process.env.EDGE_GATEWAY_HOST ?? "0.0.0.0";
  const port = Number(process.env.EDGE_GATEWAY_PORT ?? 8787);
  const { nestApp, fastify } = await bootstrapEdgeGateway();

  await nestApp.listen(port, host);
  fastify.log.info(`[edge-gateway] listening on http://${host}:${port}`);
}

await main();
