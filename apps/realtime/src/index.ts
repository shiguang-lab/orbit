import Fastify from "fastify";
import { ensureSecrets } from "@shiguang-gateway/server-runtime/startup";

await ensureSecrets();
process.env.SHIGUANG_GATEWAY_MANAGED_LIVE_WS = "1";
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
app.get("/livez", async () => ({ status: "ok" }));
app.get("/healthz", async () => ({ status: "ok" }));
const host = process.env.REALTIME_HOST ?? "0.0.0.0";
const port = Number(process.env.REALTIME_PORT ?? 8790);
await app.listen({ host, port });
const liveModule = new URL("../../../packages/gateway-runtime/src/server/ws/liveServer.ts", import.meta.url).href;
const { startLiveDashboardServer } = await import(liveModule);
const live = await startLiveDashboardServer(Number(process.env.LIVE_WS_PORT ?? 20132), process.env.LIVE_WS_HOST ?? "0.0.0.0");
const shutdown = async () => { await new Promise<void>((resolve) => live.close(resolve)); await app.close(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
