/**
 * Fastify 应用装配：插件 + 中间件 + 引擎适配 + 路由注册。
 * 结构对齐 asset-hub apps/api 的 bootstrap 模式。
 */
import type { FastifyInstance } from "fastify";
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
import { initializeRequestRuntime } from "./lib/runtimeBootstrap.js";

type FastifyReplyWithStatic = { sendFile: (name: string) => unknown };

export type GatewaySurface = "all" | "edge-gateway" | "control-api";

/** Register the complete gateway contract on an existing Fastify instance.
 *
 * Keeping registration separate from construction lets NestJS own the
 * application lifecycle while the existing route plugins remain unchanged.
 */
export async function registerGatewayApp(app: FastifyInstance, options: { surface?: GatewaySurface } = {}): Promise<FastifyInstance> {

  // Preserve multipart bodies as raw bytes. The migrated /v1/files handler
  // consumes the standard Web Request.formData() API; Fastify's default
  // parser rejects multipart with 415, so this parser forwards the exact
  // boundary-encoded payload and its content-type header to the runtime.
  app.addContentTypeParser("multipart/form-data", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

  await app.register(cors as any, {
    origin: (_origin: unknown, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
    credentials: true,
  });

  // In the container this process serves the gateway API and admin Vite bundle
  // from the same origin for a self-contained image.
  // Local Vite development keeps using its own dev server and is unaffected.
  const configuredAdminRoot = process.env.ADMIN_STATIC_DIR?.trim();
  const adminRoot = configuredAdminRoot || (existsSync("/app/apps/admin/dist")
    ? "/app/apps/admin/dist"
    : resolve(process.cwd(), "apps/admin/dist"));
  if (existsSync(adminRoot)) {
    await app.register(fastifyStatic as any, {
      root: adminRoot,
      wildcard: false,
    });
  }

  await app.register(requestIdPlugin);

  // Cheap process probes; they must not depend on any upstream service.
  app.get("/livez", async () => ({ status: "ok" }));
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ok" }));

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
    app.log.info("[gateway] local SSO broker enabled (real shiguang account)");
  } else if (process.env.SG_DEV_IDENTITY === "1") {
    app.log.info("[gateway] local dev identity enabled (loopback development)");
  } else {
    app.log.warn("[gateway] local SSO broker NOT configured (set SG_BROKER_USERNAME/PASSWORD)");
  }

  // 本地开发模式：SG_DEV_IDENTITY=1 或 broker 已配置(身份来自线上 shiguang)。
  // Local identity must take precedence over the optional shiguang broker.
  const devMode = process.env.SG_DEV_IDENTITY === "1" || broker.enabled;
  // Shiguang Gateway's native password/OIDC login is the default. shiguang SSO is opt-in
  // for separately branded web deployments.
  const shiguangAuth = process.env.SHIGUANG_GATEWAY_AUTH_MODE === "shiguang";
  const localPasswordAuth = !shiguangAuth && !broker.enabled && process.env.SG_DEV_IDENTITY !== "1";
  const engine = await createEngineAdapters();
  if (!engine) {
    throw new Error("Local runtime adapters failed to initialize; refusing skeleton/fallback mode");
  }
  await initializeRequestRuntime(options.surface ?? "all");

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
        isCliTokenAuthValid: async (request) => {
          // The runtime validator is the single source of truth for local CLI
          // machine-token authentication.  Adapt Fastify's plain header map to
          // a Web Request so the validator can preserve its loopback/locality
          // checks instead of silently denying every CLI request.
          try {
            const { isCliTokenAuthValid } = await import("@/lib/middleware/cliTokenAuth");
            const headers = new Headers();
            for (const [name, value] of Object.entries(request.headers)) {
              if (typeof value === "string") headers.set(name, value);
              else if (Array.isArray(value)) headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
            }
            const url = new URL(request.url ?? "/", "http://shiguangGateway").toString();
            return isCliTokenAuthValid(new Request(url, { headers }));
          } catch {
            return false;
          }
        },
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
    remoteSession: undefined,
    surface: options.surface,
  });
  csrfPlugin(app, { devMode });

  registerErrorHandler(app);

  const routeEngines: RouteEngines = engine
    ? { auth: engine.auth, providers: engine.providers, providerNodes: engine.providerNodes, settings: engine.settings, keys: engine.keys, home: engine.home, combos: engine.combos, analytics: engine.analytics }
    : {};
  const devBypass = process.env.SG_DEV_IDENTITY === "1";
  await app.register(routes, { engines: routeEngines, broker, localPasswordAuth, devBypass, surface: options.surface });

  if (existsSync(adminRoot)) {
    app.setNotFoundHandler(async (request, reply) => {
      // Never turn an unknown API endpoint into the SPA document.
      if (request.url.startsWith("/api/") || request.url === "/api" ||
        request.url === "/v1" || request.url.startsWith("/v1/") ||
        request.url === "/v1beta" || request.url.startsWith("/v1beta/") ||
        request.url === "/a2a" || request.url.startsWith("/a2a/") ||
        request.url.startsWith("/.well-known/") || request.url.startsWith("/live-ws")) {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      return (reply as unknown as FastifyReplyWithStatic).sendFile("index.html");
    });
  }

  return app;
}
