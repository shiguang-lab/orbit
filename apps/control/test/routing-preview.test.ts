import assert from "node:assert/strict";
import test from "node:test";

import { rankCandidates, scoreCandidate } from "../src/gateway/runtime/routing-preview.js";

test("routing preview ranks the highest eligible candidate", () => {
  const result = rankCandidates([
    {
      providerId: "slow",
      modelId: "model-a",
      capabilityScore: 0.9,
      allocation: "allow",
      healthScore: 0.8,
      circuit: "closed",
      quota: "healthy",
      latencyMs: 10_000,
    },
    {
      providerId: "fast",
      modelId: "model-b",
      capabilityScore: 0.95,
      allocation: "allow",
      healthScore: 1,
      circuit: "closed",
      quota: "healthy",
      latencyMs: 100,
    },
  ]);

  assert.equal(result.selected?.providerId, "fast");
  assert.deepEqual(result.candidates.map(({ providerId }) => providerId), ["fast", "slow"]);
});

test("routing preview excludes denied, open-circuit, and exhausted candidates", () => {
  for (const candidate of [
    { allocation: "deny" as const, circuit: "closed" as const, quota: "healthy" as const },
    { allocation: "allow" as const, circuit: "open" as const, quota: "healthy" as const },
    { allocation: "allow" as const, circuit: "closed" as const, quota: "exhausted" as const },
  ]) {
    const result = scoreCandidate({
      providerId: "blocked",
      modelId: "model",
      capabilityScore: 1,
      healthScore: 1,
      ...candidate,
    });
    assert.equal(result.eligible, false);
  }
});
