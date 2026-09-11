import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Fastify from "fastify";

const dir = mkdtempSync(join(tmpdir(), "orbit-key-client-"));
process.env.DATA_DIR = dir;
process.env.API_KEY_SECRET = "client-policy-test-secret";
process.env.DISABLE_SQLITE_AUTO_BACKUP = "true";
const keys = await import("@orbit/core/db/api-keys");
const { resetDbInstance } = await import("@orbit/core/db/connection");
const { installApiKeyClientPolicy } = await import("../src/common/api-key-client-policy.ts");
const { createKeySchema, updateKeyPermissionsSchema } = await import("@orbit/core/validation/keys");

test.after(() => { resetDbInstance(); rmSync(dir, { recursive: true, force: true }); });

async function appFor(trustProxy: false | string[] = false) {
  const app = Fastify({ trustProxy });
  installApiKeyClientPolicy(app);
  app.all("/*", async () => ({ reached: true }));
  await app.ready();
  return app;
}

test("create/edit validate and persist allowlists, including clearing restrictions", async () => {
  assert.equal(createKeySchema.safeParse({ name: "test", ipAllowlist: ["bad"] }).success, false);
  assert.equal(updateKeyPermissionsSchema.safeParse({ ipAllowlist: ["::/129"] }).success, false);
  assert.equal(updateKeyPermissionsSchema.safeParse({ ipAllowlist: [] }).success, true);
  const key = await keys.createApiKey("policy", "test", [], { ipAllowlist: ["192.0.2.0/24"] });
  assert.deepEqual((await keys.getApiKeyById(key.id))?.ipAllowlist, ["192.0.2.0/24"]);
  assert.deepEqual((await keys.getApiKeys()).find(row => row.id === key.id)?.ipAllowlist, ["192.0.2.0/24"]);
  await keys.updateApiKeyPermissions(key.id, { ipAllowlist: [] });
  assert.deepEqual((await keys.getApiKeyById(key.id))?.ipAllowlist, []);
});

test("gateway denies spoofed forwarding headers, records real caller, immediately applies updates", async () => {
  const app = await appFor();
  try {
    const key = await keys.createApiKey("caller", "test", [], { ipAllowlist: ["192.0.2.0/24"] });
    const headers = { authorization: `Bearer ${key.key}`, "user-agent": "claude-cli/1.0", "x-forwarded-for": "192.0.2.1", "x-real-ip": "192.0.2.1", "cf-connecting-ip": "192.0.2.1" };
    assert.equal((await app.inject({ url: "/v1/messages", headers, remoteAddress: "198.51.100.1" })).statusCode, 403);
    assert.equal((await keys.getApiKeyById(key.id))?.lastClientAt, null);
    assert.equal((await app.inject({ url: "/v1/responses", headers, remoteAddress: "192.0.2.42" })).statusCode, 200);
    const row = await keys.getApiKeyById(key.id);
    assert.equal(row?.lastClientIp, "192.0.2.42");
    assert.equal(row?.lastClientUserAgent, "claude-cli/1.0");
    assert.ok(row?.lastClientAt);
    await keys.updateApiKeyPermissions(key.id, { ipAllowlist: ["203.0.113.1"] });
    assert.equal((await app.inject({ url: "/v1/responses", headers, remoteAddress: "192.0.2.42" })).statusCode, 403);
    await keys.updateApiKeyPermissions(key.id, { ipAllowlist: [] });
    assert.equal((await app.inject({ url: "/v1/responses", headers, remoteAddress: "192.0.2.42" })).statusCode, 200);
    await keys.updateApiKeyPermissions(key.id, { noLog: true });
    assert.equal((await app.inject({ url: "/v1/responses", headers, remoteAddress: "192.0.2.42" })).statusCode, 200);
    assert.equal((await keys.getApiKeyById(key.id))?.lastClientIp, null);
    assert.equal((await keys.getApiKeyById(key.id))?.lastClientAt, null);
  } finally { await app.close(); }
});

test("trusted proxies use nearest untrusted hop; protocol headers and URL keys share enforcement", async () => {
  const app = await appFor(["127.0.0.1"]);
  try {
    const key = await keys.createApiKey("protocols", "test", [], { ipAllowlist: ["192.0.2.0/24"] });
    for (const credential of [{ "x-api-key": key.key }, { "x-goog-api-key": key.key }]) {
      assert.equal((await app.inject({ url: "/v1/models", remoteAddress: "127.0.0.1", headers: { ...credential, "x-forwarded-for": "203.0.113.1, 192.0.2.1" } })).statusCode, 200);
      assert.equal((await app.inject({ url: "/v1/models", remoteAddress: "127.0.0.1", headers: { ...credential, "x-forwarded-for": "192.0.2.1, 203.0.113.1" } })).statusCode, 403);
    }
    assert.equal((await app.inject({ url: `/vscode/${key.key}/models`, remoteAddress: "203.0.113.1" })).statusCode, 403);
    const ipv6 = await keys.createApiKey("ipv6", "test", [], { ipAllowlist: ["2001:db8::/32"] });
    assert.equal((await app.inject({ url: "/v1/models", remoteAddress: "2001:db8::1", headers: { authorization: `Bearer ${ipv6.key}` } })).statusCode, 200);
  } finally { await app.close(); }
});

test("caller source and allowlist survive reopening the database", async () => {
  const key = await keys.createApiKey("persistent", "test", [], { ipAllowlist: ["192.0.2.1"] });
  keys.recordApiKeyClient(key.id, "192.0.2.1", "Cursor/1.0");
  resetDbInstance();
  const row = await keys.getApiKeyById(key.id);
  assert.deepEqual(row?.ipAllowlist, ["192.0.2.1"]);
  assert.equal(row?.lastClientIp, "192.0.2.1");
  assert.equal(row?.lastClientUserAgent, "Cursor/1.0");
  assert.ok(row?.lastClientAt);
});
