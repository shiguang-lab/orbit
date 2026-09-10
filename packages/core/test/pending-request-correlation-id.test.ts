import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPendingRequests,
  getPendingById,
  sweepStalePendingRequests,
  trackPendingRequest,
} from "../src/lib/usage/usageHistory.ts";

test.beforeEach(() => clearPendingRequests());
test.after(() => clearPendingRequests());

test("combo target retries reuse the request's correlation-scoped pending id", () => {
  const firstId = trackPendingRequest("model-a", "provider-a", "conn-a", true, {
    correlationId: "corr-retry",
  });
  assert.ok(firstId);

  trackPendingRequest("model-a", "provider-a", "conn-a", false);
  assert.equal(getPendingById().has(firstId), false);

  const secondId = trackPendingRequest("model-b", "provider-b", "conn-b", true, {
    correlationId: "corr-retry",
  });
  assert.equal(secondId, firstId);
  assert.equal(getPendingById().get(firstId)?.model, "model-b");
});

test("different or absent correlation ids never share a pending id", () => {
  const idA = trackPendingRequest("model", "provider", "conn-a", true, {
    correlationId: "corr-a",
  });
  const idB = trackPendingRequest("model", "provider", "conn-b", true, {
    correlationId: "corr-b",
  });
  assert.ok(idA && idB);
  assert.notEqual(idA, idB);

  trackPendingRequest("model", "provider", "conn-c", true);
  const idsBefore = new Set(getPendingById().keys());
  const freshId = trackPendingRequest("model", "provider", "conn-d", true);
  assert.ok(freshId);
  assert.equal(idsBefore.has(freshId), false);
});

test("stale correlation mappings are swept and cannot resurrect an old id", () => {
  const firstId = trackPendingRequest("model-a", "provider-a", "conn-a", true, {
    correlationId: "corr-stale",
  });
  assert.ok(firstId);
  trackPendingRequest("model-a", "provider-a", "conn-a", false);

  sweepStalePendingRequests(Date.now() + 61_000, 60_000);
  const secondId = trackPendingRequest("model-b", "provider-b", "conn-b", true, {
    correlationId: "corr-stale",
  });
  assert.ok(secondId);
  assert.notEqual(secondId, firstId);
});
