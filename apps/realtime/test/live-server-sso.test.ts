import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { WebSocket } from "ws";

test("WebSocket verifies configured SSO assertions and the public origin", async () => {
  const root = await mkdtemp(join(tmpdir(), "live-sso-"));
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwksFile = join(root, "jwks.json");
  await writeFile(jwksFile, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: "test", alg: "RS256" }] }));
  Object.assign(process.env, {
    DATA_DIR: root, SQLITE_FILE: join(root, "storage.sqlite"), JWT_SECRET: "live-sso-test-secret",
    SG_IDENTITY_AUDIENCE: "omniroute-api", SG_IDENTITY_ENTITLEMENT: "omniroute:access",
    SG_IDENTITY_JWKS_FILE: jwksFile, PUBLIC_BASE_URL: "https://llm-gateway.shiguanglab.com",
  });
  const { startLiveDashboardServer } = await import("../src/live-ws/live-server.js");
  const runtime = await startLiveDashboardServer(0, "127.0.0.1");
  const address = runtime.server.address();
  assert.ok(address && typeof address === "object");
  async function assertion(audience = "omniroute-api", entitlement = "omniroute:access") {
    return new SignJWT({ sid: "sso-session", roles: [], entitlements: [entitlement] })
      .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: "test" })
      .setIssuer("https://shiguanglab.com").setAudience(audience).setSubject("user")
      .setIssuedAt().setNotBefore("0s").setExpirationTime("2m").sign(privateKey);
  }
  function connect(identity: string, origin = "https://llm-gateway.shiguanglab.com"): Promise<{ type: string; code?: string }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/live-ws`, { origin, headers: { "x-sg-identity": identity } });
      const timer = setTimeout(() => { ws.terminate(); reject(new Error("WS auth timeout")); }, 5000);
      ws.once("open", () => ws.send(JSON.stringify({ type: "subscribe", channels: ["requests"] })));
      ws.once("error", reject);
      ws.once("message", (raw) => { clearTimeout(timer); resolve(JSON.parse(raw.toString())); ws.close(); });
    });
  }
  try {
    assert.equal((await connect(await assertion())).type, "welcome");
    assert.equal((await connect("forged")).code, "UNAUTHORIZED");
    assert.equal((await connect(await assertion("wrong-api"))).code, "UNAUTHORIZED");
    assert.equal((await connect(await assertion("omniroute-api", "wrong:access"))).code, "UNAUTHORIZED");
    const valid = await assertion();
    const [header, claims] = valid.split(".");
    assert.equal((await connect(`${header}.${claims}.${Buffer.alloc(256).toString("base64url")}`)).code, "UNAUTHORIZED");
    assert.equal((await connect(valid, "https://untrusted.example")).code, "FORBIDDEN_ORIGIN");
  } finally {
    await runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});
