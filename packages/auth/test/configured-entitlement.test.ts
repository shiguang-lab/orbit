import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const testRoot = await mkdtemp(join(tmpdir(), "gateway-entitlement-"));
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwksFile = join(testRoot, "jwks.json");
await writeFile(jwksFile, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: "test", alg: "RS256" }] }));
process.env.SG_IDENTITY_AUDIENCE = "omniroute-api";
process.env.SG_IDENTITY_ENTITLEMENT = "omniroute:access";
process.env.SG_IDENTITY_JWKS_FILE = jwksFile;
const { handleSession } = await import("../src/gateway-session.js");
const { isDashboardSessionAuthenticated } = await import("../src/dashboard-session.js");
const { authzPlugin } = await import("../src/fastify/authz.plugin.js");
const app = Fastify();
authzPlugin(app);
app.get("/api/protected", async (request, reply) => {
  const webRequest = new Request("https://gateway.example/api/protected", { headers: request.headers as Record<string, string> });
  if (!(await isDashboardSessionAuthenticated(webRequest))) return reply.status(401).send({ error: "inner guard rejected" });
  return { success: true };
});
app.get("/api/auth/session", (request, reply) => handleSession(request, reply));
after(async () => {
  await app.close();
  await rm(testRoot, { recursive: true, force: true });
});

async function session(entitlements: string[], audience = "omniroute-api", url = "/api/auth/session") {
  const token = await new SignJWT({ sid: "session", roles: [], entitlements })
    .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: "test" })
    .setIssuer("https://shiguanglab.com").setAudience(audience).setSubject("user")
    .setIssuedAt().setNotBefore("0s").setExpirationTime("2m").sign(privateKey);
  return app.inject({ url, headers: { "x-sg-identity": token } });
}

test("accepts the configured existing product entitlement without an admin role", async () => {
  const response = await session(["omniroute:access"]);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().authenticated, true);
});

test("rejects a different product entitlement or audience", async () => {
  assert.equal((await session(["shiguang-gateway:access"])).statusCode, 401);
  assert.equal((await session(["omniroute:access"], "shiguang-gateway-api")).statusCode, 401);
});

test("SSO passes both Fastify and Web Request business guards", async () => {
  assert.equal((await session(["omniroute:access"], "omniroute-api", "/api/protected")).statusCode, 200);
  assert.equal((await session(["wrong:access"], "omniroute-api", "/api/protected")).statusCode, 401);
});
