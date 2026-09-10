import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { updateKeyPermissionsSchema } from "../src/shared/validation/schemas/keys.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-lease-occupancy-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "lease-live-occupancy-test-secret";

const db = await import("../src/lib/db/core.ts");
const providers = await import("../src/lib/db/providers.ts");
const apiKeys = await import("../src/lib/db/apiKeys.ts");
const leases = await import("../src/lib/db/exclusiveConnectionLeases.ts");
const isolation = await import("../src/lib/exclusiveLeaseIsolation.ts");

const OWNER = `vlo_${"A".repeat(43)}`;

test.after(() => {
  db.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

/**
 * Regression guard for #11775: Orbit used to fail-closed auxiliary activity on
 * every connection listed in *any* managed key's allow-list. That static
 * reservation is gone — only a live ACTIVE lease may hide a connection.
 */
test("a connection merely reserved by a managed key stays available to auxiliary activity", async () => {
  const connection = await providers.createProviderConnection({
    provider: "openai",
    authType: "apikey",
    name: "aux free connection",
    apiKey: "sk-aux-free",
    isActive: true,
  });
  await apiKeys.createApiKey("managed auxiliary", "test", ["lease:exclusive"], {
    allowedConnections: [connection.id],
  });

  assert.equal(
    await isolation.isConnectionUnavailableToAuxiliaryActivity(connection.id),
    false,
    "a statically reserved connection without an active lease must remain reachable"
  );
});

test("only an active exclusive lease hides the connection from auxiliary activity", async () => {
  const connection = await providers.createProviderConnection({
    provider: "openai",
    authType: "apikey",
    name: "aux active connection",
    apiKey: "sk-aux-active",
    isActive: true,
  });
  const key = await apiKeys.createApiKey("managed active", "test", ["lease:exclusive"], {
    allowedConnections: [connection.id],
  });
  const acquired = leases.acquireExclusiveConnectionLease({
    leaseOwnerId: OWNER,
    apiKeyId: key.id,
    provider: "openai",
    connectionId: connection.id,
  });
  assert.ok("lease" in acquired);
  if (!("lease" in acquired)) return;

  assert.equal(await isolation.isConnectionUnavailableToAuxiliaryActivity(connection.id), true);
});

test("auxiliary isolation stays fail-closed for an empty connection id", async () => {
  assert.equal(await isolation.isConnectionUnavailableToAuxiliaryActivity(""), true);
});

test("exclusive lease routing no longer reads the static key allow-list", () => {
  const isolationSource = fs.readFileSync(
    path.join(repoRoot, "packages/core/src/lib/exclusiveLeaseIsolation.ts"),
    "utf8"
  );
  const policySource = fs.readFileSync(
    path.join(repoRoot, "packages/inference/src/services/exclusiveConnectionLeasePolicy.ts"),
    "utf8"
  );

  assert.equal(isolationSource.includes("getExclusiveLeaseConnectionIds"), false);
  assert.equal(policySource.includes("getExclusiveLeaseConnectionIds"), false);
  assert.ok(policySource.includes("getExclusiveLeaseOccupancy"));
});

test("connectionAccessMode must agree with its allowedConnections allow-list", () => {
  const connection = "00000000-0000-4000-8000-000000000001";

  assert.equal(
    updateKeyPermissionsSchema.safeParse({
      connectionAccessMode: "restricted",
      allowedConnections: [],
    }).success,
    false
  );
  assert.equal(updateKeyPermissionsSchema.safeParse({ connectionAccessMode: "restricted" }).success, false);
  assert.equal(
    updateKeyPermissionsSchema.safeParse({
      connectionAccessMode: "restricted",
      allowedConnections: [connection],
    }).success,
    true
  );
  assert.equal(
    updateKeyPermissionsSchema.safeParse({
      connectionAccessMode: "all",
      allowedConnections: [],
    }).success,
    true
  );
  assert.equal(
    updateKeyPermissionsSchema.safeParse({
      connectionAccessMode: "all",
      allowedConnections: [connection],
    }).success,
    false
  );
});

test("omitting connectionAccessMode keeps partial PATCH payloads valid", () => {
  assert.equal(updateKeyPermissionsSchema.safeParse({ name: "renamed" }).success, true);
});
