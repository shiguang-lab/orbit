import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-lease-status-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "lease-status-test-secret";
const db = await import("../src/lib/db/core.ts");
const providers = await import("../src/lib/db/providers.ts");
const apiKeys = await import("../src/lib/db/apiKeys.ts");
const leases = await import("../src/lib/db/exclusiveConnectionLeases.ts");

test.after(() => {
  db.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("lease status is owner/key/generation fenced and returns only a safe configured name", async () => {
  const connection = await providers.createProviderConnection({
    provider: "codex",
    authType: "oauth",
    name: "Primary Codex",
    email: "private@example.com",
    accessToken: "secret-token",
    isActive: true,
  });
  const key = await apiKeys.createApiKey("lease-test", "test");
  const owner = `vlo_${"A".repeat(43)}`;
  const acquired = leases.acquireExclusiveConnectionLease({
    leaseOwnerId: owner,
    apiKeyId: key.id,
    provider: "codex",
    connectionId: connection.id,
  });
  assert.ok("lease" in acquired);
  if (!("lease" in acquired)) return;

  const status = leases.getExclusiveConnectionLeaseStatus({
    leaseOwnerId: owner,
    apiKeyId: key.id,
    generation: acquired.lease.generation,
  });
  assert.equal(status?.connectionName, "Primary Codex");
  assert.equal(status?.provider, "codex");
  assert.equal(
    leases.getExclusiveConnectionLeaseStatus({
      leaseOwnerId: owner,
      apiKeyId: "foreign-key",
      generation: acquired.lease.generation,
    }),
    null
  );
  assert.equal(JSON.stringify(status).includes("secret-token"), false);
  assert.equal(JSON.stringify(status).includes("private@example.com"), false);
});
