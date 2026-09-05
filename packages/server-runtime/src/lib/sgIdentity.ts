/**
 * X-SG-Identity 断言校验：移植自 asset-hub apps/api/src/platform/sg-identity.ts。
 *
 * 生产信任链：
 *   Access Gateway(边缘) 校验 __Secure-sg_session cookie → 调 auth-service 决策
 *   → auth-service 签发 RS256 断言(typ=sg-identity+jwt) → 注入 X-SG-Identity 头
 *   → 产品后端(Gateway) 用共享 JWKS 校验签名 + iss/aud/exp/entitlement
 *
 * Gateway 用 audience=shiguang-gateway-api、entitlement=shiguang-gateway:access(可环境变量覆盖)。
 */
import {
  createPublicKey,
  type JsonWebKey,
  type KeyObject,
  verify as verifySignature,
} from "node:crypto";
import { readFile } from "node:fs/promises";

interface IdentityHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

interface IdentityClaims {
  aud?: unknown;
  entitlements?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  nbf?: unknown;
  name?: unknown;
  org_id?: unknown;
  roles?: unknown;
  sid?: unknown;
  sub?: unknown;
}

interface JsonWebKeySet {
  keys?: Array<JsonWebKey & { alg?: string; kid?: string; use?: string }>;
}

export interface SgIdentityOptions {
  issuer: string;
  audience: string;
  entitlement: string;
  jwksUrl: string;
  jwksFile?: string;
}

export interface ResolvedSgIdentity {
  sub: string;
  sessionId: string;
  displayName?: string;
  organizationId?: string;
  roles: string[];
  entitlements: string[];
}

const CLOCK_TOLERANCE_SECONDS = 10;

export class SgIdentityVerifier {
  private readonly keys = new Map<string, KeyObject>();
  private keysExpireAt = 0;

  constructor(private readonly options: SgIdentityOptions) {}

  async verify(token: string): Promise<ResolvedSgIdentity | null> {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerPart, claimsPart, signaturePart] = parts;
    if (!headerPart || !claimsPart || !signaturePart) return null;

    const header = decodeJson<IdentityHeader>(headerPart);
    const claims = decodeJson<IdentityClaims>(claimsPart);
    if (
      !header ||
      !claims ||
      header.alg !== "RS256" ||
      header.typ !== "sg-identity+jwt" ||
      typeof header.kid !== "string"
    ) {
      return null;
    }

    const key = await this.keyFor(header.kid);
    if (!key) return null;

    const valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${headerPart}.${claimsPart}`),
      key,
      Buffer.from(signaturePart, "base64url"),
    );
    if (!valid || !this.validClaims(claims)) return null;

    const subject = String(claims.sub);
    const orgId = typeof claims.org_id === "string" ? claims.org_id : undefined;
    return {
      sub: subject,
      sessionId: String(claims.sid),
      displayName: typeof claims.name === "string" ? claims.name : undefined,
      organizationId: orgId && orgId !== "" ? orgId : undefined,
      roles: stringArray(claims.roles),
      entitlements: stringArray(claims.entitlements),
    };
  }

  private validClaims(claims: IdentityClaims): boolean {
    const now = Math.floor(Date.now() / 1000);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const entitlements = stringArray(claims.entitlements);
    return (
      claims.iss === this.options.issuer &&
      audience.includes(this.options.audience) &&
      typeof claims.sub === "string" &&
      claims.sub.length > 0 &&
      typeof claims.sid === "string" &&
      claims.sid.length > 0 &&
      typeof claims.exp === "number" &&
      claims.exp >= now - CLOCK_TOLERANCE_SECONDS &&
      typeof claims.nbf === "number" &&
      claims.nbf <= now + CLOCK_TOLERANCE_SECONDS &&
      typeof claims.iat === "number" &&
      claims.iat <= now + CLOCK_TOLERANCE_SECONDS &&
      entitlements.includes(this.options.entitlement)
    );
  }

  private async keyFor(kid: string): Promise<KeyObject | null> {
    if (Date.now() >= this.keysExpireAt || !this.keys.has(kid)) {
      await this.refreshKeys();
    }
    return this.keys.get(kid) ?? null;
  }

  private async refreshKeys(): Promise<void> {
    const body = await this.readJwks();
    const next = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (!jwk.kid || jwk.kty !== "RSA" || (jwk.alg && jwk.alg !== "RS256")) continue;
      next.set(jwk.kid, createPublicKey({ format: "jwk", key: jwk }));
    }
    if (next.size === 0) throw new Error("JWKS contains no RS256 keys");
    this.keys.clear();
    for (const [kid, key] of next) this.keys.set(kid, key);
    this.keysExpireAt = Date.now() + 5 * 60_000;
  }

  private async readJwks(): Promise<JsonWebKeySet> {
    if (this.options.jwksFile) {
      return JSON.parse(await readFile(this.options.jwksFile, "utf8")) as JsonWebKeySet;
    }
    const response = await fetch(this.options.jwksUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`JWKS returned ${response.status}`);
    return (await response.json()) as JsonWebKeySet;
  }
}

function decodeJson<T>(part: string): T | null {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}
