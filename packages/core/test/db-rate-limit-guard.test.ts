import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-db-rate-limit-guard-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "db-rate-limit-guard-test";

const { getDbInstance } = await import("../src/lib/db/core.ts");
const { setConnectionRateLimitUntil } = await import("../src/lib/db/providers/rateLimit.ts");
const { RENAMED_MIGRATION_COMPATIBILITY } = await import(
  "../src/lib/db/migrationRunner/constants.ts"
);

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

function seedConnection(id: string): void {
  const db = getDbInstance();
  db.prepare(
    "INSERT INTO provider_connections (id, provider, name, created_at, updated_at) VALUES (?,?,?,?,?)"
  ).run(id, "openai", `conn-${id}`, new Date().toISOString(), new Date().toISOString());
}

function readUntil(id: string): number | null {
  const row = getDbInstance()
    .prepare("SELECT rate_limited_until FROM provider_connections WHERE id = ?")
    .get(id) as { rate_limited_until?: number | string | null } | undefined;
  const raw = row?.rate_limited_until;
  if (raw === null || raw === undefined) return null;
  // The column is TEXT: a persisted number comes back as a numeric string.
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

test("non-finite and already-expired writes never poison or clobber the column", () => {
  seedConnection("c-guard");

  setConnectionRateLimitUntil("c-guard", Number.NaN);
  assert.equal(readUntil("c-guard"), null, "NaN must not be persisted");

  setConnectionRateLimitUntil("c-guard", Number.POSITIVE_INFINITY);
  assert.equal(readUntil("c-guard"), null, "Infinity must not be persisted");

  const future = Date.now() + 60_000;
  setConnectionRateLimitUntil("c-guard", future);
  assert.equal(readUntil("c-guard"), future, "a future timestamp must persist");

  setConnectionRateLimitUntil("c-guard", Date.now() - 60_000);
  assert.equal(readUntil("c-guard"), future, "an expired write must not clobber a live cooldown");

  setConnectionRateLimitUntil("c-guard", null);
  assert.equal(readUntil("c-guard"), null, "null remains the clear path");
});

test("renamed migration compatibility covers the reused 056/073/077/101 slots", () => {
  const byName = new Map(
    RENAMED_MIGRATION_COMPATIBILITY.map((entry) => [
      `${entry.fromVersion}:${entry.fromName}`,
      entry,
    ])
  );
  for (const [version, fromName, toName] of [
    ["056", "provider_default", "mcp_accessibility_compression"],
    ["073", "discovery_results", "per_model_token_limits"],
    ["077", "plugin_metrics", "api_key_stream_default_mode"],
    ["101", "proxy_pool_rotation", "api_key_usage_limits"],
  ] as const) {
    const entry = byName.get(`${version}:${fromName}`);
    assert.ok(entry, `missing renamed compatibility for ${version} ${fromName}`);
    assert.equal(entry.toVersion, version);
    assert.equal(entry.toName, toName);
  }
});
