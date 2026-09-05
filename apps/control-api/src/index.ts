import { createNestApplication } from "@shiguang-gateway/server-runtime";
import { ensureSecrets } from "@shiguang-gateway/server-runtime/startup";

await ensureSecrets();
process.env.SHIGUANG_GATEWAY_MANAGED_LIVE_WS = "1";
const host = process.env.CONTROL_API_HOST ?? "0.0.0.0";
const port = Number(process.env.CONTROL_API_PORT ?? 8788);
const { nestApp, fastify } = await createNestApplication("control-api");
await nestApp.listen(port, host);
fastify.log.info(`[control-api] listening on http://${host}:${port}`);
const shutdown = async () => { await nestApp.close(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
