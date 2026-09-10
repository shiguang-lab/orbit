import assert from "node:assert/strict";
import test from "node:test";
import { isModelCapacityOverloadError } from "@orbit/core/resilience/circuit-breaker";
import { shouldTripProviderBreakerForResult } from "../src/handlers/chatPredicates.js";
import { resolveCircuitOpenWaitDecision } from "../src/services/combo/comboCooldownRetry.js";
import { shouldRecordProviderBreakerFailure } from "../src/services/combo/comboPredicates.js";

test("recognizes model-capacity overloads without classifying ordinary 5xx errors", () => {
  assert.equal(isModelCapacityOverloadError(529), true);
  assert.equal(isModelCapacityOverloadError({ status: 529 }), true);
  assert.equal(isModelCapacityOverloadError({ statusCode: 529 }), true);
  assert.equal(isModelCapacityOverloadError("STREAM_EARLY_EOF: Overloaded"), true);
  assert.equal(isModelCapacityOverloadError({ message: "overloaded_error" }), true);
  assert.equal(isModelCapacityOverloadError(new Error("upstream unavailable")), false);
  assert.equal(isModelCapacityOverloadError(503), false);
});

test("single-model and combo predicates keep overloaded 502 off provider breaker", () => {
  const overloaded = new Error("STREAM_EARLY_EOF: Overloaded");
  assert.equal(
    shouldTripProviderBreakerForResult({ status: 502, error: overloaded }, false, false),
    false
  );
  assert.equal(
    shouldTripProviderBreakerForResult({ status: 502, error: new Error("bad gateway") }, false, false),
    true
  );
  assert.equal(
    shouldRecordProviderBreakerFailure({
      isStreamReadinessFailure: true,
      isStreamEarlyEof: true,
      status: 502,
      sameProviderNext: false,
      error: overloaded,
    }),
    false
  );
  assert.equal(
    shouldRecordProviderBreakerFailure({
      isStreamReadinessFailure: true,
      isStreamEarlyEof: true,
      status: 502,
      sameProviderNext: false,
      error: new Error("bad gateway"),
    }),
    true
  );
});

test("short circuit-open reset uses cooldown limits, attempt cap, and budget", () => {
  const settings = { enabled: true, maxWaitMs: 1_000, maxAttempts: 2, budgetMs: 2_000 };
  assert.deepEqual(
    resolveCircuitOpenWaitDecision({
      skippedForCircuitOpen: true,
      retryAfterMs: 500,
      attempt: 0,
      budgetLeftMs: 1_000,
      settings,
    }),
    { wait: true, waitMs: 550, reason: "circuit_open" }
  );
  assert.equal(
    resolveCircuitOpenWaitDecision({
      skippedForCircuitOpen: true,
      retryAfterMs: 500,
      attempt: 2,
      budgetLeftMs: 1_000,
      settings,
    }).wait,
    false
  );
  assert.equal(
    resolveCircuitOpenWaitDecision({
      skippedForCircuitOpen: true,
      retryAfterMs: 500,
      attempt: 0,
      budgetLeftMs: 500,
      settings,
    }).wait,
    false
  );
});
