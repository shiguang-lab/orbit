import assert from "node:assert/strict";
import test from "node:test";

import type { FreeModelBudget } from "@orbit/providers/free-model-catalog";
import {
  classifyConnectionState,
  classifyStrictZeroCostCandidate,
} from "../src/services/autoCombo/strictZeroCostFilter.ts";

const now = Date.parse("2026-09-09T00:00:00.000Z");
const candidate = {
  provider: "example",
  model: "free-model",
  connectionId: "conn-1",
};
const entry: FreeModelBudget = {
  provider: "example",
  modelId: "free-model",
  displayName: "Free Model",
  monthlyTokens: 1_000,
  creditTokens: 0,
  freeType: "recurring-monthly",
  poolKey: null,
  tos: "ok",
  hardStopGuaranteed: true,
};
const thresholds = { minRemainingAllowance: 1, maxStateAgeMs: 60_000, now: () => now };

function state(status: "SAFE" | "EXHAUSTED" | "UNKNOWN", remaining: number | null, age = 0) {
  return {
    status,
    remainingFreeAllowance: remaining,
    resetAt: null,
    checkedAt: new Date(now - age).toISOString(),
  };
}

test("connection classification distinguishes exhausted from missing or stale state", () => {
  assert.equal(classifyConnectionState("example", "conn", () => undefined, thresholds), "state-unknown");
  assert.equal(
    classifyConnectionState("example", "conn", () => state("EXHAUSTED", 0), thresholds),
    "exhausted"
  );
  assert.equal(
    classifyConnectionState("example", "conn", () => state("EXHAUSTED", 0, 120_000), thresholds),
    "state-unknown"
  );
  assert.equal(
    classifyConnectionState("example", "conn", () => state("SAFE", 50), thresholds),
    "safe"
  );
});

test("candidate verdict reports catalog and contract exclusion reasons", () => {
  const noState = () => undefined;
  assert.equal(
    classifyStrictZeroCostCandidate(candidate, undefined, noState, thresholds).outcome,
    "not-in-catalog"
  );
  assert.equal(
    classifyStrictZeroCostCandidate(
      candidate,
      { ...entry, freeType: "discontinued" },
      noState,
      thresholds
    ).outcome,
    "regime-not-free"
  );
  assert.equal(
    classifyStrictZeroCostCandidate(
      candidate,
      { ...entry, hardStopGuaranteed: false },
      noState,
      thresholds
    ).outcome,
    "no-hard-stop"
  );
  assert.equal(
    classifyStrictZeroCostCandidate(
      { ...candidate, connectionId: null, allowedConnectionIds: [] },
      entry,
      noState,
      thresholds
    ).outcome,
    "no-connection"
  );
});

test("candidate verdict returns safe ids and gives observed exhaustion priority", () => {
  const multi = { ...candidate, connectionId: null, allowedConnectionIds: ["missing", "empty"] };
  const verdict = classifyStrictZeroCostCandidate(
    multi,
    entry,
    (_provider, connectionId) =>
      connectionId === "empty" ? state("EXHAUSTED", 0) : undefined,
    thresholds
  );
  assert.equal(verdict.outcome, "exhausted");

  const safe = classifyStrictZeroCostCandidate(
    multi,
    entry,
    (_provider, connectionId) => state("SAFE", connectionId === "missing" ? 50 : 0),
    thresholds
  );
  assert.deepEqual(safe, { outcome: "safe", safeConnectionIds: ["missing"] });
});
