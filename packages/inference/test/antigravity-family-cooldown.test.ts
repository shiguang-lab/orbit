import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-agy-family-cooldown-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "agy-family-cooldown-test-secret";

const db = await import("@orbit/core/db/connection");
const providers = await import("@orbit/core/db/provider-connections");
const fallback = await import("../src/services/accountFallback.ts");
const familyCooldown = await import("../src/services/antigravityFamilyCooldown.ts");

test.after(() => {
  fallback.clearAllModelLockouts();
  db.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("model quota exhaustion locks one Antigravity family without cooling the connection", async () => {
  fallback.clearAllModelLockouts();
  const connection = await providers.createProviderConnection({
    provider: "antigravity",
    authType: "oauth",
    name: "family-test",
    isActive: true,
    accessToken: "test-only",
  });

  assert.equal(
    familyCooldown.markAntigravityModelQuotaExhausted(
      connection.id,
      60 * 60 * 1000,
      "gemini-3.1-flash-lite"
    ),
    true
  );
  assert.equal(fallback.isModelLocked("agy", connection.id, "gemini-3.7-flash-high"), true);
  assert.equal(fallback.isModelLocked("agy", connection.id, "claude-opus-4-6"), false);
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
  const persisted = await providers.getProviderConnectionById(connection.id);
  assert.equal(persisted?.rateLimitedUntil ?? null, null);
  const persistedData = persisted?.providerSpecificData as Record<string, unknown> | undefined;
  const untils = persistedData?.antigravityFamilyRateLimitedUntil as
    | Record<string, unknown>
    | undefined;
  assert.equal(typeof untils?.gemini, "string");
});

test("persisted family cooldown rehydrates after process-local locks are cleared", async () => {
  fallback.clearAllModelLockouts();
  const connection = await providers.createProviderConnection({
    provider: "agy",
    authType: "oauth",
    name: "rehydrate-test",
    isActive: true,
    accessToken: "test-only",
  });
  await familyCooldown.persistAntigravityFamilyCooldown({
    connectionId: connection.id,
    model: "claude-sonnet-4",
    rateLimitedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  fallback.clearAllModelLockouts();
  const persisted = await providers.getProviderConnectionById(connection.id);
  familyCooldown.rehydrateAntigravityFamilyLocks(
    "agy",
    connection.id,
    persisted?.providerSpecificData as Record<string, unknown> | undefined
  );
  assert.equal(fallback.isModelLocked("antigravity", connection.id, "claude-opus-4-6"), true);
  assert.equal(
    fallback.isModelLocked("antigravity", connection.id, "gemini-3.1-flash-lite"),
    false
  );
  assert.equal(persisted?.rateLimitedUntil ?? null, null);
});

test("generic Antigravity error state does not persist a whole-connection cooldown", async () => {
  const connection = await providers.createProviderConnection({
    provider: "antigravity",
    authType: "oauth",
    name: "error-state-test",
    isActive: true,
    accessToken: "test-only",
  });
  fallback.applyErrorState(
    { id: connection.id, backoffLevel: 0, rateLimitedUntil: null },
    429,
    "quota exhausted",
    "antigravity"
  );
  const persisted = await providers.getProviderConnectionById(connection.id);
  assert.equal(persisted?.rateLimitedUntil ?? null, null);
});
