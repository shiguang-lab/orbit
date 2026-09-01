/**
 * shiguang 统一身份终结：BFF 的 /api/auth/session 逻辑。
 *
 * 生产形态(网关后)：
 *  - Access Gateway 校验 __Secure-sg_session cookie → 注入 X-SG-Identity(RS256 JWT)
 *  - BFF 用 SgIdentityVerifier 做 JWKS 签名校验 + iss/aud/exp/entitlement 校验
 *  - 校验通过且具备管理权限(system:admin / omniroute:admin / omniroute:access) → 返回统一会话
 *  - 用户信息/权限全部来自网关，BFF 只做"身份终结 + 权限判定"
 *
 * 本地/开发形态：
 *  - 无网关时通过 SG_DEV_IDENTITY=1 注入 dev 身份(仅本地验证，生产绝不可用)
 *
 * 对齐 asset-hub apps/api 的 IdentityService.resolve 思路：
 *  - X-SG-Identity → 网关断言(JWKS 校验)
 *  - devAuth → 本地演示身份
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { SgIdentityVerifier, type ResolvedSgIdentity } from "./sgIdentity.js";
import type { LocalBrokerSession } from "./broker.js";

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

const verifier = new SgIdentityVerifier({
  issuer: process.env.SG_IDENTITY_ISSUER ?? "https://shiguanglab.com",
  audience: process.env.SG_IDENTITY_AUDIENCE ?? "omniroute-api",
  entitlement: process.env.SG_IDENTITY_ENTITLEMENT ?? "omniroute:access",
  jwksUrl:
    process.env.SG_IDENTITY_JWKS_URL ??
    "https://shiguanglab.com/.well-known/sg-identity-jwks.json",
  jwksFile: process.env.SG_IDENTITY_JWKS_FILE,
});

/** 校验断言是否具备管理权限(system:admin 或 omniroute 管理角色/entitlement) */
export function isAdminIdentity(identity: ResolvedSgIdentity | null): boolean {
  if (!identity || !identity.sub) return false;
  const all = new Set([...identity.roles, ...identity.entitlements]);
  return all.has("system:admin") || all.has("omniroute:admin") || all.has("omniroute:access");
}

export async function resolveGatewayIdentity(
  request: FastifyRequest,
): Promise<ResolvedSgIdentity | null> {
  const raw = request.headers["x-sg-identity"];
  const headerValue = Array.isArray(raw) ? raw[0] : raw;
  if (!headerValue) return null;
  // 生产：JWKS 签名校验
  const verified = await verifier.verify(headerValue);
  if (verified) return verified;
  // 校验失败：不信任未验证的明文断言
  return null;
}

function resolveDevIdentity(): ResolvedSgIdentity {
  return {
    sub: "dev-admin",
    displayName: "开发管理员",
    roles: ["system:admin"],
    entitlements: ["omniroute:access"],
  };
}

/** /api/auth/session handler */
export async function handleSession(
  request: FastifyRequest,
  reply: FastifyReply,
  devBypass: boolean,
  broker?: { enabled: boolean; session(): Promise<LocalBrokerSession | null> },
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
