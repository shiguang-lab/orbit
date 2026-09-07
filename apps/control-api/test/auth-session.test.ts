import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const root = await mkdtemp(join(tmpdir(), "control-session-"));
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwks = join(root, "jwks.json");
await writeFile(jwks, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: "session-test", alg: "RS256" }] }));
process.env.DATA_DIR = root;
process.env.JWT_SECRET = "sso-csrf-test-secret";
process.env.SG_IDENTITY_AUDIENCE = "omniroute-api";
process.env.SG_IDENTITY_ENTITLEMENT = "omniroute:access";
process.env.SG_IDENTITY_JWKS_FILE = jwks;
// Use the compiled controller so the test verifies actual Nest route metadata.
const { AuthController } = await import("../dist/auth/auth.controller.js");
const { AuthService } = await import("../dist/auth/auth.service.js");
class SessionTestModule {}
Module({ controllers: [AuthController], providers: [AuthService] })(SessionTestModule);
const adapter = new FastifyAdapter();
const app = await NestFactory.create(SessionTestModule, adapter, { logger: false });
await app.init();
const server = adapter.getInstance();
const { requireManagementAuth } = await import("@shiguang-gateway/core-domain/control/management-auth");
server.get("/api/test-management", async (request, reply) => {
  const error = await requireManagementAuth(new Request("https://gateway.example/api/settings", { headers: request.headers as Record<string, string> }));
  if (error) return reply.status(error.status).send(await error.json());
  return { success: true };
});
await server.ready();
after(async () => { await app.close(); await rm(root, { recursive: true, force: true }); });

test("control session route accepts the existing signed SSO product grant", async () => {
  const token = await new SignJWT({ sid: "session", roles: [], entitlements: ["omniroute:access"] })
    .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: "session-test" })
    .setIssuer("https://shiguanglab.com").setAudience("omniroute-api").setSubject("user")
    .setIssuedAt().setNotBefore("0s").setExpirationTime("2m").sign(privateKey);
  const response = await server.inject({ url: "/api/auth/session", headers: { "x-sg-identity": token } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().authenticated, true);
  assert.equal(response.json().subject, "user");
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal((await server.inject({ url: "/api/test-management", headers: { "x-sg-identity": token } })).statusCode, 200);
  const csrf = await server.inject({ url: "/api/auth/csrf", headers: { "x-sg-identity": token } });
  assert.equal(csrf.statusCode, 200);
  assert.ok(csrf.json().token);

});

test("control session route rejects absent or forged SSO assertions", async () => {
  assert.equal((await server.inject({ url: "/api/auth/session" })).statusCode, 401);
  assert.equal((await server.inject({ url: "/api/auth/session", headers: { "x-sg-identity": "forged" } })).statusCode, 401);
});

test("local password and OIDC routes have been removed", async () => {
  for (const [method, url] of [["POST", "/api/auth/login"], ["GET", "/api/auth/oidc/login"], ["GET", "/api/auth/oidc/callback"], ["GET", "/api/auth/status"]] as const) {
    assert.equal((await server.inject({ method, url })).statusCode, 404);
  }
});

test("old password cookies cannot establish a session", async () => {
  const token = await new SignJWT({ authenticated: true }).setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2m").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  assert.equal((await server.inject({ url: "/api/auth/session", headers: { cookie: `auth_token=${token}` } })).statusCode, 401);
});

test("logout revokes the SSO session and forwards cookie removal", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), "https://shiguanglab.com/api/auth/logout");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("origin"), "https://gateway.example");
    assert.equal(headers.get("cookie"), "__Secure-sg_session=test-session");
    return Response.json({ redirect: "/" }, { headers: { "set-cookie": "__Secure-sg_session=; Max-Age=0; Secure; HttpOnly; Path=/" } });
  };
  try {
    const response = await server.inject({ method: "POST", url: "/api/auth/logout", headers: {
      host: "gateway.example", origin: "https://gateway.example", cookie: "__Secure-sg_session=test-session",
    } });
    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["set-cookie"]), /Max-Age=0/);
    assert.equal((await server.inject({ method: "POST", url: "/api/auth/logout", headers: {
      host: "gateway.example", origin: "https://attacker.example",
    } })).statusCode, 403);
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    assert.equal((await server.inject({ method: "POST", url: "/api/auth/logout", headers: {
      host: "gateway.example", origin: "https://gateway.example",
    } })).statusCode, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
