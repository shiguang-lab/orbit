/**
 * shiguang 统一身份终结：Gateway 的 /api/auth/session 逻辑。
 *
 * 生产形态(网关后)：
 *  - Access Gateway 校验 __Secure-sg_session cookie → 注入 X-SG-Identity(RS256 JWT)
 *  - Gateway 用 SgIdentityVerifier 做 JWKS 签名校验 + iss/aud/exp/entitlement 校验
 *  - 校验通过且具备管理权限(system:admin / shiguang-gateway:admin / shiguang-gateway:access) → 返回统一会话
 *  - 用户信息/权限全部来自网关，Gateway 只做"身份终结 + 权限判定"
 *
 * 本地/开发形态：
 *  - 无网关时通过 SG_DEV_IDENTITY=1 注入 dev 身份(仅本地验证，生产绝不可用)
 *
 * 对齐 asset-hub apps/api 的 IdentityService.resolve 思路：
 *  - X-SG-Identity → 网关断言(JWKS 校验)
 *  - devAuth → 本地演示身份
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";
import { SgIdentityVerifier, type ResolvedSgIdentity } from "./sg-identity.verifier.js";
import type { LocalBrokerSession } from "./local-auth-broker.js";

export interface SessionOptions {
  issuer: string;
  audience: string;
  entitlement: string;
  jwksUrl: string;
  jwksFile?: string;
  devBypass: boolean;
}

export interface ResolvedIdentity {
  sub: string;
  displayName: string;
  email: string | null;
  roles: string[];
  entitlements: string[];
}

const requiredEntitlement = process.env.SG_IDENTITY_ENTITLEMENT ?? "shiguang-gateway:access";
const verifier = new SgIdentityVerifier({
  issuer: process.env.SG_IDENTITY_ISSUER ?? "https://shiguanglab.com",
  audience: process.env.SG_IDENTITY_AUDIENCE ?? "shiguang-gateway-api",
  entitlement: requiredEntitlement,
  jwksUrl:
    process.env.SG_IDENTITY_JWKS_URL ??
    "https://shiguanglab.com/.well-known/sg-identity-jwks.json",
  jwksFile: process.env.SG_IDENTITY_JWKS_FILE,
});
const identityResolutionCache = new WeakMap<FastifyRequest, Promise<ResolvedSgIdentity | null>>();

/** 已验签身份须具备管理员角色或当前部署配置的产品授权。 */
export function isAdminIdentity(identity: ResolvedSgIdentity | null): boolean {
  if (!identity || !identity.sub) return false;
  const all = new Set([...identity.roles, ...identity.entitlements]);
  return all.has("system:admin") || all.has("shiguang-gateway:admin") || identity.entitlements.includes(requiredEntitlement);
}

export async function resolveGatewayIdentity(
  request: FastifyRequest,
): Promise<ResolvedSgIdentity | null> {
  const cached = identityResolutionCache.get(request);
  if (cached) return cached;

  const raw = request.headers["x-sg-identity"];
  const headerValue = Array.isArray(raw) ? raw[0] : raw;
  if (!headerValue) return null;
  // 生产：JWKS 签名校验。同一个请求中的鉴权与 CSRF 共享验签结果。
  const resolution = verifier.verify(headerValue);
  identityResolutionCache.set(request, resolution);
  return resolution;
}

function resolveDevIdentity(): ResolvedSgIdentity {
  return {
    sub: "dev-admin",
    sessionId: "dev-session",
    displayName: "开发管理员",
    roles: ["system:admin"],
    entitlements: [requiredEntitlement],
  };
}

/** /api/auth/session handler */
export async function handleSession(
  request: FastifyRequest,
  reply: FastifyReply,
  devBypass: boolean,
  broker?: { enabled: boolean; session(): Promise<LocalBrokerSession | null> },
  localPasswordAuth = false,
): Promise<FastifyReply> {
  // 1. 生产/网关形态：X-SG-Identity(JWKS 验签)
  let identity = await resolveGatewayIdentity(request);
  if (identity) {
    if (!isAdminIdentity(identity)) {
      return reply.status(403).send({ authenticated: false, error: "forbidden" });
    }
    return reply.status(200).send({
      authenticated: true,
      subject: identity.sub,
      displayName: identity.displayName ?? identity.sub,
      email: null,
      roles: identity.roles,
      platformRoles: identity.roles.filter((r) => r.includes("admin")),
      entitlements: identity.entitlements,
    });
  }

  // 2. 显式开启的本地 Broker(用真实 shiguang 账号从线上换身份)
  if (broker?.enabled) {
    const brokerSession = await broker.session();
    if (brokerSession) {
      return reply.status(200).send({
        ...brokerSession,
        localBroker: true,
      });
    }
    // Explicit broker mode must fail visibly when the online broker is
    // unavailable; silently switching to a different identity hides config
    // errors and makes real-account testing misleading.
    return reply.status(503).send({
      authenticated: false,
      error: "local_broker_unavailable",
    });
  }

  // Local password mode: the independent runtime issues auth_token. Verify
  // that cookie locally when the Gateway runs beside the engine.
  if (localPasswordAuth) {
    const rawCookie = request.headers.cookie;
    const token = rawCookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("auth_token="))
      ?.slice("auth_token=".length);
    if (token && process.env.JWT_SECRET?.trim()) {
      try {
        await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        return reply.status(200).send({ authenticated: true, subject: "admin", displayName: "Admin", roles: ["system:admin"], platformRoles: ["system:admin"], entitlements: [] });
      } catch {
        // Fall through to the normal unauthenticated response.
      }
    }
    return reply.status(401).send({ authenticated: false });
  }

  // 3. 本地默认：SG_DEV_IDENTITY=1 注入 dev 身份(仅本地)
  if (devBypass) {
    identity = resolveDevIdentity();
    return reply.status(200).send({
      authenticated: true,
      subject: identity.sub,
      displayName: identity.displayName ?? identity.sub,
      email: null,
      roles: identity.roles,
      platformRoles: identity.roles.filter((r) => r.includes("admin")),
      entitlements: identity.entitlements,
    });
  }

  return reply.status(401).send({ authenticated: false });
}
