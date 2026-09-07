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
process.env.SHIGUANG_GATEWAY_AUTH_MODE = "shiguang";
process.env.SG_IDENTITY_AUDIENCE = "omniroute-api";
process.env.SG_IDENTITY_ENTITLEMENT = "omniroute:access";
process.env.SG_IDENTITY_JWKS_FILE = jwks;
// Use the compiled controller so the test verifies actual Nest route metadata.
const { AuthController } = await import("../dist/auth/auth.controller.js");
const { AuthService } = await import("../dist/auth/auth.service.js");
class SessionTestModule {}
Module({ controllers: [AuthController], providers: [{ provide: AuthService, useValue: {} }] })(SessionTestModule);
const adapter = new FastifyAdapter();
const app = await NestFactory.create(SessionTestModule, adapter, { logger: false });
await app.init();
const server = adapter.getInstance();
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
});

test("control session route rejects absent or forged SSO assertions", async () => {
  assert.equal((await server.inject({ url: "/api/auth/session" })).statusCode, 401);
  assert.equal((await server.inject({ url: "/api/auth/session", headers: { "x-sg-identity": "forged" } })).statusCode, 401);
});
