import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-limits-lease-refresh-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "limits-lease-refresh-test-secret";

const db = await import("@orbit/core/db/connection");
const providers = await import("@orbit/core/db/provider-connections");
const leases = await import("@orbit/core/db/exclusive-connection-leases");
const limits = await import("../src/services/providerLimits.ts");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OWNER = `vlo_${"Q".repeat(43)}`;

const realFetch = globalThis.fetch;

test.after(() => {
  globalThis.fetch = realFetch;
  db.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

/**
 * Regression guard for #11758: an exclusive lease only isolates a connection from
 * *auxiliary* activity. Refreshing that connection's usage/quota is a read-only
 * observation and must keep working while the lease is serving requests.
 */
test("live quota refresh proceeds for a connection held by an active exclusive lease", async () => {
  const connection = await providers.createProviderConnection({
    provider: "deepseek",
    authType: "apikey",
    name: "leased quota connection",
    apiKey: "sk-leased-quota",
    isActive: true,
  });
  const acquired = leases.acquireExclusiveConnectionLease({
    leaseOwnerId: OWNER,
    apiKeyId: "managed-quota-key",
    provider: "deepseek",
    connectionId: connection.id,
  });
  assert.ok("lease" in acquired);
  if (!("lease" in acquired)) return;

  let externalCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    externalCalls += 1;
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("api.deepseek.com/user/balance")) {
      return new Response(
        JSON.stringify({
          is_available: true,
          balance_infos: [
            { currency: "USD", total_balance: "10.00", granted_balance: "0.00", topped_up_balance: "10.00" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    throw new Error(`unexpected fetch call: ${url}`);
  }) as typeof globalThis.fetch;

  const result = await limits.fetchLiveProviderLimits(connection.id);
  assert.equal(result.connection.id, connection.id);
  const quotas = result.usage.quotas as { credits_usd?: { remaining?: number } } | undefined;
  assert.equal(quotas?.credits_usd?.remaining, 10);
  assert.equal(externalCalls, 1, "an actively leased connection must still allow the read-only quota fetch");
});

test("provider limits no longer consult the auxiliary isolation gate", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "packages/inference/src/services/providerLimits.ts"),
    "utf8"
  );
  assert.equal(source.includes("isConnectionUnavailableToAuxiliaryActivity"), false);
});

test("connection verification still isolates an actively leased connection", () => {
  // The isolation gate stays intact for mutating auxiliary paths — only the
  // read-only usage fetch was decoupled in #11758.
  const resetCredits = fs.readFileSync(
    path.join(repoRoot, "packages/inference/src/services/codexResetCredits.ts"),
    "utf8"
  );
  assert.ok(resetCredits.includes("isConnectionUnavailableToAuxiliaryActivity"));
});
