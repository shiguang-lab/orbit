/**
 * CSRF 插件：复刻 Orbit src/server/authz/csrf.ts。
 * HMAC-SHA256 token，头名 x-omniroute-csrf，对管理端点写操作校验。
 * token 绑定 auth_token cookie 或已由网关注入的 X-SG-Identity。
 */
import { createHash, createHmac } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export const DASHBOARD_CSRF_HEADER = "x-omniroute-csrf";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_SECONDS = 10 * 60;
const TOKEN_CONTEXT = "omniroute-dashboard-csrf-v1";

export interface DashboardCsrfToken {
  token: string;
  expiresAt: string;
}

function getJwtSecret(): Buffer | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret ? Buffer.from(secret, "utf8") : null;
}

function getCookieValue(request: FastifyRequest, name: string): string | null {
  const cookieHeader = request.headers.cookie ?? "";
  for (const segment of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = segment.split("=");
    if (rawKey.trim() === name) return rawValue.join("=").trim() || null;
  }
  return null;
}

function getSessionBinding(request: FastifyRequest): string | null {
  return getCookieValue(request, "auth_token") || (() => {
    const raw = request.headers["x-sg-identity"];
    return (Array.isArray(raw) ? raw[0] : raw) || null;
  })();
}

function sessionHash(authToken: string): string {
  return createHash("sha256").update(authToken).digest("base64url");
}

function csrfMac(secret: Buffer, expiresAtSeconds: number, authToken: string): Buffer {
  return createHmac("sha256", secret)
    .update(TOKEN_CONTEXT)
    .update("\n")
    .update(String(expiresAtSeconds))
    .update("\n")
    .update(sessionHash(authToken))
    .digest();
}

export function issueDashboardCsrfToken(
  request: FastifyRequest,
  nowMs: number = Date.now(),
): DashboardCsrfToken | null {
  const secret = getJwtSecret();
  const authToken = getSessionBinding(request);
  if (!secret || !authToken) return null;
  const expiresAtSeconds = Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS;
  const mac = csrfMac(secret, expiresAtSeconds, authToken).toString("base64url");
  return {
    token: `${TOKEN_VERSION}.${expiresAtSeconds}.${mac}`,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export function validateDashboardCsrfToken(
  request: FastifyRequest,
  nowMs: number = Date.now(),
): boolean {
  const secret = getJwtSecret();
  const authToken = getSessionBinding(request);
  const rawToken = request.headers[DASHBOARD_CSRF_HEADER];
  const headerValue = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!secret || !authToken || !headerValue) return false;

  const [version, rawExpiresAt, rawMac, ...extra] = headerValue.split(".");
  if (extra.length > 0 || version !== TOKEN_VERSION || !rawExpiresAt || !rawMac) return false;

  const expiresAtSeconds = Number(rawExpiresAt);
  const nowSeconds = Math.floor(nowMs / 1000);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds < nowSeconds) return false;

  let providedMac: Buffer;
  try {
    providedMac = Buffer.from(rawMac, "base64url");
  } catch {
    return false;
  }

  const expected = csrfMac(secret, expiresAtSeconds, authToken);
  if (providedMac.length !== expected.length) return false;
  // timingSafeEqual(origin) 常量时间比较
  return timingSafeEqual(providedMac, expected);
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 写方法才需要 CSRF(与 installDashboardCsrfFetch 只在 mutating 请求带头对齐) */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfPlugin(app: FastifyInstance, opts: { devMode?: boolean } = {}): void {
  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://bff").pathname;
    if (!pathname.startsWith("/api/")) return;
    if (pathname.startsWith("/api/v1/")) return;
    if (!WRITE_METHODS.has(request.method)) return;
    if (csrfExempt(pathname)) return;
    // 本地开发模式(SG_DEV_IDENTITY=1 或 broker 已配置)：豁免(仅本地，生产绝不可用)
    if (opts.devMode) return;

    if (!validateDashboardCsrfToken(request)) {
      return reply.status(403).send({
        error: { type: "invalid_request", message: "CSRF token missing or invalid" },
        requestId: request.id,
      });
    }
  });
}

function csrfExempt(pathname: string): boolean {
  return [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/oidc/login",
    "/api/init",
    "/api/cli/connect",
  ].includes(pathname);
}
