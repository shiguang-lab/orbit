import { createNestApplication } from "@shiguang-gateway/server-runtime";
import { ensureSecrets } from "@shiguang-gateway/server-runtime/startup";

await ensureSecrets();
process.env.SHIGUANG_GATEWAY_MANAGED_LIVE_WS = "1";
const host = process.env.EDGE_GATEWAY_HOST ?? "0.0.0.0";
const port = Number(process.env.EDGE_GATEWAY_PORT ?? 8787);
const { nestApp, fastify } = await createNestApplication("edge-gateway");
await nestApp.listen(port, host);
let liveServer: { close: (callback?: () => void) => void } | null = null;
if (process.env.SHIGUANG_GATEWAY_ENABLE_LIVE_WS !== "0" && process.env.SHIGUANG_GATEWAY_ENABLE_LIVE_WS !== "false") {
  const moduleUrl = new URL("../../../packages/gateway-runtime/src/server/ws/liveServer.ts", import.meta.url).href;
  const { startLiveDashboardServer } = await import(moduleUrl);
  liveServer = await startLiveDashboardServer(Number(process.env.LIVE_WS_PORT ?? 20132), process.env.LIVE_WS_HOST ?? "0.0.0.0");
}
fastify.log.info(`[edge-gateway] listening on http://${host}:${port}`);
const shutdown = async () => {
  if (liveServer) await new Promise<void>((resolve) => liveServer?.close(resolve));
  await nestApp.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
