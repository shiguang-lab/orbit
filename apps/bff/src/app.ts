/**
 * Fastify 应用装配：插件 + 中间件 + 引擎适配 + 路由注册。
 * 结构对齐 asset-hub apps/api 的 bootstrap 模式。
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { registerErrorHandler } from "./plugins/error.js";
import { authzPlugin, type EngineAuthAdapter } from "./middleware/authz.js";
import { csrfPlugin } from "./middleware/csrf.js";
import { requestIdPlugin } from "./middleware/requestId.js";
import { routes, type RouteEngines } from "./routes/index.js";
import { createEngineAdapters } from "./lib/engine.js";
import { LocalAuthBroker } from "./lib/broker.js";
import { checkNasSession, isLocalBffPath, isNativeAuthPath, proxyToNas } from "./lib/nasProxy.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 20 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  });

  // In the container the BFF is the single process for the gateway image. Serve
  // the Vite bundle from the same origin so NAS only needs to pull one image.
  // Local Vite development keeps using its own dev server and is unaffected.
  const configuredAdminRoot = process.env.ADMIN_STATIC_DIR?.trim();
  const adminRoot = configuredAdminRoot || (existsSync("/app/apps/admin/dist")
    ? "/app/apps/admin/dist"
    : resolve(process.cwd(), "apps/admin/dist"));
  if (existsSync(adminRoot)) {
    await app.register(fastifyStatic, {
      root: adminRoot,
      wildcard: false,
    });
  }

  await app.register(requestIdPlugin);

  // 本地 SSO Broker：用真实 shiguang 账号从线上换身份(asset-hub 同款)。
  // 必须显式开启，避免仅因环境中残留账号变量就改变本地鉴权模式。
  const brokerRequested = process.env.SG_LOCAL_BROKER_ENABLED === "true";
  const brokerUsername = brokerRequested ? process.env.SG_BROKER_USERNAME ?? "" : "";
  const brokerPassword = brokerRequested ? process.env.SG_BROKER_PASSWORD ?? "" : "";
  if (brokerRequested && (!brokerUsername.trim() || !brokerPassword)) {
    throw new Error("SG_BROKER_USERNAME and SG_BROKER_PASSWORD are required when SG_LOCAL_BROKER_ENABLED=true");
  }
  const broker = new LocalAuthBroker({
    authTarget: process.env.SG_BROKER_AUTH_TARGET ?? "https://shiguanglab.com",
    loginName: brokerUsername,
    password: brokerPassword,
  });
  if (broker.enabled) {
    app.log.info("[bff] local SSO broker enabled (real shiguang account)");
  } else if (process.env.SG_DEV_IDENTITY === "1") {
    app.log.info("[bff] local dev identity enabled (loopback development)");
  } else {
    app.log.warn("[bff] local SSO broker NOT configured (set SG_BROKER_USERNAME/PASSWORD)");
  }

  // 本地管理台只运行 Web+BFF；业务数据和写操作统一走 NAS 上的 Orbit。
  // 未配置 NAS target 时才启用旧的同机引擎模式（生产部署在 Orbit 同机时使用）。
  const nasTarget = process.env.OMNIROUTE_NAS_API_TARGET?.trim();
  // 本地开发模式：SG_DEV_IDENTITY=1 或 broker 已配置(身份来自线上 shiguang)。
  // 本地身份必须优先于 NAS 的官方登录模式，否则 /api/auth/session 会被
  // 转发到 NAS，而本机 dev identity 永远不会生效。
  const devMode = process.env.SG_DEV_IDENTITY === "1" || broker.enabled;
  // Orbit's native password/OIDC login is the default. shiguang SSO is opt-in
  // for separately branded web deployments.
  const shiguangAuth = process.env.ORBIT_AUTH_MODE === "shiguang";
  const officialRemoteAuth = Boolean(nasTarget && !shiguangAuth && !devMode);
  const officialLocalAuth = !shiguangAuth && !broker.enabled && process.env.SG_DEV_IDENTITY !== "1";
  const engine = nasTarget ? null : await createEngineAdapters();

  // 鉴权中间件复用引擎的真实能力(getSettings / API key 校验 / CLI token)
  const authzEngine: EngineAuthAdapter | undefined = engine
    ? {
        isValidApiKey: async (apiKey: string) => {
          // 复用引擎的 isValidApiKey + getApiKeyMetadata
          try {
            const { isValidApiKey } = await import("@/sse/services/auth");
            return isValidApiKey(apiKey);
          } catch {
            return false;
          }
        },
        getApiKeyMetadata: async (apiKey: string) => {
          try {
            const { getApiKeyMetadata } = await import("@/lib/db/apiKeys");
            const meta = await getApiKeyMetadata(apiKey);
            if (!meta) return null;
            return { scopes: meta.scopes ?? [], name: meta.name };
          } catch {
            return null;
          }
        },
        isCliTokenAuthValid: async () => false, // CLI token 校验后续接线
        getSettings: async () => {
          try {
            const { getSettings } = await import("@/lib/localDb");
            return (await getSettings()) as Record<string, unknown>;
          } catch {
            return {};
          }
        },
      }
    : undefined;

  // 注意：authz/csrf 的 hook 必须挂在根 app 上才能对后续 register(routes) 的子上下文生效。
  // 直接调用插件函数(而非 app.register(plugin))，避免 Fastify 封装隔离。
  authzPlugin(app, {
    engine: authzEngine,
    devMode,
    remoteSession: officialRemoteAuth
      ? (request) => checkNasSession(request, nasTarget!, process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY)
      : undefined,
  });
  csrfPlugin(app, { devMode });

  // Register after authz/CSRF so a remotely proxied request cannot bypass the
  // BFF's protection when this process is deployed outside loopback.
  if (nasTarget) {
    app.log.info({ target: nasTarget }, "[bff] NAS API proxy enabled; local Orbit database disabled");
    app.addHook("preHandler", async (request, reply) => {
      const pathname = new URL(request.url, "http://bff").pathname;
      if (
        !pathname.startsWith("/api/") ||
        isLocalBffPath(pathname) ||
        (!officialRemoteAuth && isNativeAuthPath(pathname))
      ) return;
      return proxyToNas(request, reply, {
        target: nasTarget,
        managementApiKey: process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY,
        broker,
        forwardSessionCookie: officialRemoteAuth && isNativeAuthPath(pathname),
      });
    });
  }

  registerErrorHandler(app);

  const routeEngines: RouteEngines = engine
    ? { auth: engine.auth, providers: engine.providers, providerNodes: engine.providerNodes, settings: engine.settings, keys: engine.keys, home: engine.home, combos: engine.combos, analytics: engine.analytics }
    : {};
  const devBypass = process.env.SG_DEV_IDENTITY === "1";
  await app.register(routes, { engines: routeEngines, devBypass, broker, officialRemoteAuth, officialAuth: officialLocalAuth });

  if (existsSync(adminRoot)) {
    app.setNotFoundHandler(async (request, reply) => {
      // Never turn an unknown API endpoint into the SPA document.
      if (request.url.startsWith("/api/") || request.url.startsWith("/live-ws")) {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
