/**
 * 鉴权中间件：复刻 Shiguang Gateway src/lib/api/requireManagementAuth.ts + isDashboardSessionAuthenticated。
 *
 * 迁移策略：
 *  - JWT cookie 校验：直接用 jose 在本 Gateway 内实现(与原逻辑一致：auth_token JWT + JWT_SECRET)。
 *  - API key / CLI token / 引擎侧校验：通过 EngineAuthAdapter 注入(指向本地 runtime 的
 *    isValidApiKey/getApiKeyMetadata/isCliTokenAuthValid 等)，保证与引擎零重复实现。
 *  - 管理 scope 判定：MANAGEMENT_API_KEY_SCOPES(manage/admin) 内联常量，与引擎同步。
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { jwtVerify } from "jose";
import { isAdminIdentity, resolveGatewayIdentity } from "../lib/session.js";

/** 与引擎 src/shared/constants/managementScopes.ts 保持同步 */
export const MANAGE_SCOPE = "manage";
export const MANAGEMENT_API_KEY_SCOPES = new Set<string>(["manage", "admin"]);

export function hasManageScope(scopes: readonly string[] = []): boolean {
  for (const scope of scopes) {
    if (MANAGEMENT_API_KEY_SCOPES.has(scope)) return true;
  }
  return false;
}

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
  /** 引擎适配器；缺省时仅支持 JWT cookie(供骨架先跑通) */
  engine?: EngineAuthAdapter;
  /** 所有管理端点强制鉴权(跳过 requireLogin 探测) */
  alwaysRequireAuth?: boolean;
  /** 本地开发模式(SG_DEV_IDENTITY=1 或 broker 已配置)：放行管理端点(仅本地，生产绝不可用) */
  devMode?: boolean;
  remoteSession?: (request: FastifyRequest) => Promise<boolean>;
}

/** 从 Cookie 头解析 auth_token(与原 getCookieValueFromHeader 一致) */
export function getCookieValueFromHeader(
  headers: FastifyRequest["headers"],
  name: string,
): string | null {
  const raw = headers.cookie;
  const cookieHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=") || null;
  }
  return null;
}

async function isDashboardSessionAuthenticated(request: FastifyRequest): Promise<boolean> {
  if (!process.env.JWT_SECRET) return false;
  const token = getCookieValueFromHeader(request.headers, "auth_token");
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

async function isAuthRequired(options: AuthzOptions, request: FastifyRequest): Promise<boolean> {
  if (options.alwaysRequireAuth) return true;
  if (!options.engine) return true; // 无引擎时默认强制
  try {
    const settings = await options.engine.getSettings();
    // requireLogin === true 或配置了密码/OIDC 才需要登录
    return (
      settings.requireLogin === true ||
      typeof settings.password === "string" ||
      settings.oidcEnabled === true
    );
  } catch {
    return true;
  }
}

/**
 * Fastify 插件：对管理路由(/api/* 且非公开)执行鉴权。
 * 与原 central managementPolicy 对齐：JWT cookie → loopback → CLI token → API key(manage scope)。
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

    if (!(await isAuthRequired(opts, request))) return;

    // 1. Dashboard JWT cookie
    if (await isDashboardSessionAuthenticated(request)) return;

    // Production SSO requests arrive with a gateway-issued, JWKS-verified
    // X-SG-Identity header rather than the local auth_token cookie.
    const gatewayIdentity = await resolveGatewayIdentity(request);
    if (isAdminIdentity(gatewayIdentity)) return;

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
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/status",
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

const PUBLIC_API_ROUTES_PREFIX = ["/api/auth/oidc/", "/api/oauth/"];

const PUBLIC_READONLY = new Set(["/api/settings/require-login", "/api/monitoring/health"]);

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
