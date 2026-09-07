/**
 * CSRF 插件：复刻 Shiguang Gateway src/server/authz/csrf.ts。
 * HMAC-SHA256 token，头名 x-shiguangGateway-csrf，对管理端点写操作校验。
 * token 绑定经过 JWKS 验证的稳定 SSO 会话身份。
 */
import { createHash, createHmac } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { resolveGatewayIdentity } from "../gateway-session.js";

export const DASHBOARD_CSRF_HEADER = "x-shiguangGateway-csrf";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_SECONDS = 10 * 60;
const TOKEN_CONTEXT = "shiguangGateway-dashboard-csrf-v1";

export interface DashboardCsrfToken {
  token: string;
  expiresAt: string;
}

function getJwtSecret(): Buffer | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret ? Buffer.from(secret, "utf8") : null;
}

async function getSessionBinding(request: FastifyRequest): Promise<string | null> {
  const identity = await resolveGatewayIdentity(request);
  if (!identity) return null;
  return ["sso", identity.sessionId, identity.sub, identity.organizationId ?? ""].join("\n");
}

function sessionHash(sessionBinding: string): string {
  return createHash("sha256").update(sessionBinding).digest("base64url");
}

function csrfMac(secret: Buffer, expiresAtSeconds: number, sessionBinding: string): Buffer {
  return createHmac("sha256", secret)
    .update(TOKEN_CONTEXT)
    .update("\n")
    .update(String(expiresAtSeconds))
    .update("\n")
    .update(sessionHash(sessionBinding))
    .digest();
}

export async function issueDashboardCsrfToken(
  request: FastifyRequest,
  nowMs: number = Date.now(),
): Promise<DashboardCsrfToken | null> {
  const secret = getJwtSecret();
  const sessionBinding = await getSessionBinding(request);
  if (!secret || !sessionBinding) return null;
  const expiresAtSeconds = Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS;
  const mac = csrfMac(secret, expiresAtSeconds, sessionBinding).toString("base64url");
  return {
    token: `${TOKEN_VERSION}.${expiresAtSeconds}.${mac}`,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export async function validateDashboardCsrfToken(
  request: FastifyRequest,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const secret = getJwtSecret();
  const sessionBinding = await getSessionBinding(request);
  // Fastify/node normalizes incoming header names to lowercase, while the
  // exported wire constant intentionally preserves the product casing.
  const rawToken =
    request.headers[DASHBOARD_CSRF_HEADER] ??
    request.headers[DASHBOARD_CSRF_HEADER.toLowerCase()];
  const headerValue = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!secret || !sessionBinding || !headerValue) return false;

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

  const expected = csrfMac(secret, expiresAtSeconds, sessionBinding);
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
    const pathname = new URL(request.url, "http://gateway").pathname;
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/v1/") && !pathname.startsWith("/v1beta/") && !pathname.startsWith("/a2a")) return;
    if (pathname.startsWith("/api/v1/") || pathname.startsWith("/v1/") || pathname.startsWith("/v1beta/") || pathname.startsWith("/a2a")) return;
    if (!WRITE_METHODS.has(request.method)) return;
    if (csrfExempt(pathname)) return;
    // Bearer/API-key requests are not authenticated by a browser cookie, so
    // they cannot be exploited via cross-site request forgery. Management
    // automation and provider test-batch calls must remain usable with a
    // scoped API key; cookie sessions still require the HMAC token below.
    const authorization = request.headers.authorization;
    const apiKeyHeader = request.headers["x-api-key"];
    if ((typeof authorization === "string" && authorization.startsWith("Bearer ")) ||
      (typeof apiKeyHeader === "string" && apiKeyHeader.trim().length > 0)) return;
    // 本地开发模式(SG_DEV_IDENTITY=1 或 broker 已配置)：豁免(仅本地，生产绝不可用)
    if (opts.devMode) return;

    if (!(await validateDashboardCsrfToken(request))) {
      return reply.status(403).send({
        error: { type: "invalid_request", message: "CSRF token missing or invalid" },
        requestId: request.id,
      });
    }
  });
}

function csrfExempt(pathname: string): boolean {
  return [
    "/api/auth/logout",
    "/api/init",
    "/api/cli/connect",
  ].includes(pathname);
}
