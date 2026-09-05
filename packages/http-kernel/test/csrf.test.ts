import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import Fastify from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const issuer = "https://shiguanglab.com";
const audience = "shiguang-gateway-api";
const entitlement = "shiguang-gateway:access";
const keyId = "csrf-test-key";
const testRoot = await mkdtemp(join(tmpdir(), "shiguang-gateway-csrf-"));
const jwksFile = join(testRoot, "jwks.json");
const { privateKey, publicKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
await writeFile(
  jwksFile,
  JSON.stringify({ keys: [{ ...publicJwk, alg: "RS256", kid: keyId, use: "sig" }] }),
);

process.env.JWT_SECRET = "csrf-test-secret-with-sufficient-entropy";
process.env.SG_IDENTITY_ISSUER = issuer;
process.env.SG_IDENTITY_AUDIENCE = audience;
process.env.SG_IDENTITY_ENTITLEMENT = entitlement;
process.env.SG_IDENTITY_JWKS_FILE = jwksFile;

const {
  DASHBOARD_CSRF_HEADER,
  csrfPlugin,
  issueDashboardCsrfToken,
} = await import("../src/middleware/csrf.js");

const app = Fastify({ logger: false });
csrfPlugin(app);
app.get("/api/auth/csrf", async (request, reply) => {
  const token = await issueDashboardCsrfToken(request);
  if (!token) return reply.status(401).send({ error: "not authenticated" });
  return reply.send(token);
});
app.post("/api/protected", async (_request, reply) => reply.send({ ok: true }));

after(async () => {
  await app.close();
  await rm(testRoot, { recursive: true, force: true });
});

async function signIdentity(options: {
  sessionId?: string;
  subject?: string;
  organizationId?: string;
  jwtId: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    roles: ["system:admin"],
    entitlements: [entitlement],
    org_id: options.organizationId ?? "",
  };
  if (options.sessionId !== undefined) claims.sid = options.sessionId;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: keyId })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(options.subject ?? "user-1")
    .setJti(options.jwtId)
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(now + 120)
    .sign(privateKey);
}

async function fetchCsrf(identity: string): Promise<string> {
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/csrf",
    headers: { "x-sg-identity": identity },
  });
  assert.equal(response.statusCode, 200);
  return response.json<{ token: string }>().token;
}

test("accepts a CSRF token across rotated assertions for the same SSO session", async () => {
  const firstAssertion = await signIdentity({ sessionId: "session-1", jwtId: "assertion-1" });
  const rotatedAssertion = await signIdentity({ sessionId: "session-1", jwtId: "assertion-2" });
  assert.notEqual(firstAssertion, rotatedAssertion);

  const csrfToken = await fetchCsrf(firstAssertion);
  const response = await app.inject({
    method: "POST",
    url: "/api/protected",
    headers: {
      "x-sg-identity": rotatedAssertion,
      [DASHBOARD_CSRF_HEADER]: csrfToken,
    },
  });

  assert.equal(response.statusCode, 200);
});

test("rejects a CSRF token from another SSO session", async () => {
  const csrfToken = await fetchCsrf(
    await signIdentity({ sessionId: "session-1", jwtId: "assertion-3" }),
  );
  const response = await app.inject({
    method: "POST",
    url: "/api/protected",
    headers: {
      "x-sg-identity": await signIdentity({ sessionId: "session-2", jwtId: "assertion-4" }),
      [DASHBOARD_CSRF_HEADER]: csrfToken,
    },
  });

  assert.equal(response.statusCode, 403);
});

test("rejects a CSRF token after the organization context changes", async () => {
  const csrfToken = await fetchCsrf(
    await signIdentity({ sessionId: "session-1", organizationId: "org-1", jwtId: "assertion-5" }),
  );
  const response = await app.inject({
    method: "POST",
    url: "/api/protected",
    headers: {
      "x-sg-identity": await signIdentity({
        sessionId: "session-1",
        organizationId: "org-2",
        jwtId: "assertion-6",
      }),
      [DASHBOARD_CSRF_HEADER]: csrfToken,
    },
  });

  assert.equal(response.statusCode, 403);
});

test("rejects an SSO assertion without the required stable session id", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/csrf",
    headers: {
      "x-sg-identity": await signIdentity({ jwtId: "assertion-7" }),
    },
  });

  assert.equal(response.statusCode, 401);
});

test("keeps local cookie sessions isolated", async () => {
  const issued = await app.inject({
    method: "GET",
    url: "/api/auth/csrf",
    headers: { cookie: "auth_token=local-session-1" },
  });
  assert.equal(issued.statusCode, 200);
  const csrfToken = issued.json<{ token: string }>().token;

  const accepted = await app.inject({
    method: "POST",
    url: "/api/protected",
    headers: {
      cookie: "auth_token=local-session-1",
      [DASHBOARD_CSRF_HEADER]: csrfToken,
    },
  });
  const rejected = await app.inject({
    method: "POST",
    url: "/api/protected",
    headers: {
      cookie: "auth_token=local-session-2",
      [DASHBOARD_CSRF_HEADER]: csrfToken,
    },
  });

  assert.equal(accepted.statusCode, 200);
  assert.equal(rejected.statusCode, 403);
});
