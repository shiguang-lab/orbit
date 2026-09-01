/**
 * @omniroute/bff —— OmniRoute 管理后端(迁移版)。
 *
 * 架构：Fastify + 复刻原 Next.js API 的 HTTP 层(路由/鉴权/错误/SSE)，
 * 业务逻辑通过引擎引用复用(指向 vendor/orbit 的纯 TS 模块)。
 *
 * 迁移原则(与原 Next.js API 行为完全一致)：
 *  - 错误信封：{error:{type,message,details}, requestId}
 *  - 鉴权：management policy(JWT cookie / CLI token / API key manage scope) + CSRF(HMAC)
 *  - SSE：text/event-stream，事件名/心跳格式照搬
 *  - 公开路由映射(/v1/*、/chat/completions 等)在路由注册时重建
 */
import { ensureSecrets } from "./lib/startup.js";

// 必须先初始化引擎依赖的密钥(JWT_SECRET/API_KEY_SECRET)，再加载引擎相关模块
await ensureSecrets();

const { buildApp } = await import("./app.js");

const port = Number(process.env.BFF_PORT ?? 8787);
const host = process.env.BFF_HOST ?? "127.0.0.1";
const localAuthEnabled =
  process.env.SG_DEV_IDENTITY === "1" || process.env.SG_LOCAL_BROKER_ENABLED === "true";
const nasProxyEnabled = Boolean(process.env.OMNIROUTE_NAS_API_TARGET?.trim());
const productionNasProxyEnabled = process.env.OMNIROUTE_NAS_PROXY_ENABLED === "true";
const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

// Local bypass/broker is a development-only capability. Fail closed before
// binding if it is enabled in production or on a non-loopback interface.
if (localAuthEnabled && (process.env.NODE_ENV !== "development" || !loopbackHosts.has(host))) {
  throw new Error("Local auth bypass/broker requires NODE_ENV=development and a loopback BFF host");
}

// The NAS target is a local-development data bridge, not a public/open proxy.
// Production deployments run the BFF beside Orbit (without this variable).
if (nasProxyEnabled && !productionNasProxyEnabled && (process.env.NODE_ENV !== "development" || !loopbackHosts.has(host))) {
  throw new Error("OMNIROUTE_NAS_API_TARGET requires development loopback mode unless OMNIROUTE_NAS_PROXY_ENABLED=true");
}

const app = await buildApp();

try {
  await app.listen({ port, host });
  app.log.info(`[bff] listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

async function shutdown() {
  await app.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
