import assert from "node:assert/strict";
import test from "node:test";
import { compareLeastUsedConnections } from "../src/services/leastUsedOrdering.ts";

test("least-used prefers a healthy account before an older backed-off account", () => {
  const healthy = { id: "healthy", backoffLevel: 0, lastUsedAt: "2026-09-10T00:01:00Z" };
  const backedOff = { id: "backed-off", backoffLevel: 2, lastUsedAt: "2026-09-10T00:00:00Z" };
  assert.equal([backedOff, healthy].sort(compareLeastUsedConnections)[0].id, "healthy");
});

test("least-used retains timestamp ordering when backoff levels match", () => {
  const newer = { id: "newer", backoffLevel: 0, lastUsedAt: "2026-09-10T00:01:00Z" };
  const older = { id: "older", backoffLevel: 0, lastUsedAt: "2026-09-10T00:00:00Z" };
  assert.equal([newer, older].sort(compareLeastUsedConnections)[0].id, "older");
});
