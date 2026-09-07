/** Management APIs accept verified SSO sessions or scoped machine credentials. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  isDashboardSessionAuthenticated,
} from "../dashboard-session.js";
export { getCookieValueFromHeader } from "../dashboard-session.js";
import {
  hasManageScope,
  MANAGE_SCOPE,
  MANAGEMENT_API_KEY_SCOPES,
} from "../management-scopes.js";

export interface EngineAuthAdapter {
  /** 校验 API key 是否有效(引擎 isValidApiKey) */
  isValidApiKey(apiKey: string): Promise<boolean>;
  /** 取 API key 元数据(引擎 getApiKeyMetadata)，含 scopes */
  getApiKeyMetadata(
    apiKey: string,
  ): Promise<{ scopes: string[]; name?: string } | null>;
  /** 校验 CLI machine token(引擎 isCliTokenAuthValid) */
  isCliTokenAuthValid(request: { headers: FastifyRequest["headers"]; url?: string }): Promise<boolean>;
  /** 读取 requireLogin / oidc 等设置(引擎 getSettings) */
  getSettings(): Promise<Record<string, unknown>>;
}

export interface AuthzOptions {
  /** 引擎适配器；缺省时仅支持 SSO 会话 */
  engine?: EngineAuthAdapter;
  /** 所有管理端点强制鉴权(跳过 requireLogin 探测) */
  alwaysRequireAuth?: boolean;
  /** 本地开发模式(SG_DEV_IDENTITY=1 或 broker 已配置)：放行管理端点(仅本地，生产绝不可用) */
  devMode?: boolean;
  remoteSession?: (request: FastifyRequest) => Promise<boolean>;
}

/**
 * Fastify 插件：对管理路由(/api/* 且非公开)执行鉴权。
 * 与原 central managementPolicy 对齐：SSO 会话 → CLI token → API key(manage scope)。
 */
export function authzPlugin(app: FastifyInstance, opts: AuthzOptions = {}): void {
  app.decorate("authzEngine", opts.engine ?? null);

  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://gateway").pathname;
    const method = request.method;

    // 只保护管理 API(与原 isManagementApiRequest 一致)
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/v1/") && !pathname.startsWith("/v1beta/") && !pathname.startsWith("/a2a")) return;
    if (pathname.startsWith("/api/v1/") || pathname.startsWith("/v1/") || pathname.startsWith("/v1beta/") || pathname.startsWith("/a2a")) return;
    if (isPublicApiRoute(pathname, method)) return;

    // GET/HEAD 公开只读端点豁免
    if (isPublicReadonly(pathname, method)) return;

    // 本地开发模式(SG_DEV_IDENTITY=1 或 broker 已配置)：放行(仅本地，生产绝不可用)
    if (opts.devMode) return;

    // 1. Verified dashboard SSO session
    if (await isDashboardSessionAuthenticated(request)) return;

    if (opts.remoteSession && (await opts.remoteSession(request))) return;

    // 2. CLI token(需引擎)
    const engine = opts.engine;
    if (engine && (await engine.isCliTokenAuthValid({ headers: request.headers, url: request.url }))) {
      return;
    }

    // 3. API key with manage scope(需引擎)
    if (engine) {
      const apiKey = extractBearerApiKey(request.headers);
      if (apiKey) {
        try {
          if (!(await engine.isValidApiKey(apiKey))) {
            return reply.status(401).send({
              error: { type: "invalid_request", message: "Invalid API key" },
              requestId: request.id,
            });
          }
          const meta = await engine.getApiKeyMetadata(apiKey);
          if (meta && hasManageScope(meta.scopes)) {
            return;
          }
          return reply.status(403).send({
            error: {
              type: "invalid_request",
              message: "API key lacks 'manage' scope. Enable it in the API Keys dashboard.",
            },
            requestId: request.id,
          });
        } catch {
          return reply.status(503).send({
            error: { type: "server_error", message: "Service temporarily unavailable" },
            requestId: request.id,
          });
        }
      }
    }

    return reply.status(401).send({
      error: { type: "invalid_request", message: "Authentication required" },
      requestId: request.id,
    });
  });
}

function extractBearerApiKey(headers: FastifyRequest["headers"]): string | null {
  const auth = headers.authorization ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  // x-api-key(Anthropic 兼容)与 X-Goog-Api-Key 也可作为管理 key
  const xApiKey = headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey) return xApiKey;
  return null;
}

/** 公开精确路由(与 src/shared/constants/publicApiRoutes.ts 对齐，取核心) */
const PUBLIC_API_ROUTES_EXACT = new Set([
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/auth/session",
  "/api/init",
  "/api/health",
  "/api/health/ping",
  "/api/health/degradation",
  "/api/healthz",
  "/api/livez",
  "/api/readyz",
]);

const PUBLIC_API_ROUTES_PREFIX = ["/api/oauth/"];

const PUBLIC_READONLY = new Set(["/api/monitoring/health"]);

function isPublicApiRoute(pathname: string, method: string): boolean {
  if (PUBLIC_API_ROUTES_EXACT.has(pathname)) return true;
  if (PUBLIC_API_ROUTES_PREFIX.some((p) => pathname.startsWith(p))) return true;
  // /api/health 精确放行(健康探针)
  void method;
  return false;
}

function isPublicReadonly(pathname: string, method: string): boolean {
  return method === "GET" && PUBLIC_READONLY.has(pathname);
}
