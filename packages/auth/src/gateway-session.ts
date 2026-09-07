/** Verify the access gateway assertion and expose the SSO dashboard session. */
import type { FastifyRequest, FastifyReply } from "fastify";
import { SgIdentityVerifier, type ResolvedSgIdentity } from "./sg-identity.verifier.js";

export interface SessionOptions {
  issuer: string;
  audience: string;
  entitlement: string;
  jwksUrl: string;
  jwksFile?: string;
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
const identityResolutionCache = new WeakMap<object, Promise<ResolvedSgIdentity | null>>();

/** 已验签身份须具备管理员角色或当前部署配置的产品授权。 */
export function isAdminIdentity(identity: ResolvedSgIdentity | null): boolean {
  if (!identity || !identity.sub) return false;
  const all = new Set([...identity.roles, ...identity.entitlements]);
  return all.has("system:admin") || all.has("shiguang-gateway:admin") || identity.entitlements.includes(requiredEntitlement);
}

export async function resolveGatewayIdentity(
  request: Pick<FastifyRequest, "headers">,
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

/** /api/auth/session handler */
export async function handleSession(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  reply.header("cache-control", "no-store");
  // 1. 生产/网关形态：X-SG-Identity(JWKS 验签)
  const identity = await resolveGatewayIdentity(request);
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

  return reply.status(401).send({ authenticated: false });
}
