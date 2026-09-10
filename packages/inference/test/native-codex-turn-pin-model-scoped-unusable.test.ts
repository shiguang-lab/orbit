import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getCircuitBreaker } from "@orbit/core/resilience/circuit-breaker";
import { resetAllCircuitBreakers } from "@orbit/core/resilience/circuit-breaker";
import { clearAllModelLockouts, lockModel } from "../src/services/accountFallback.ts";
import {
  NATIVE_CODEX_PINNED_MODEL_UNAVAILABLE_CODE,
  areAllPinnedTargetsModelScopedUnusable,
  createPinnedModelUnavailableResponse,
  isPinnedTargetModelScopedUnusable,
} from "../src/services/combo/nativeCodexTurnPin.ts";
import type { ResolvedComboTarget } from "../src/services/combo/types.ts";

const PROVIDER = "codex";
const CONNECTION_ID = "conn-pin-1";
const MODEL = "gpt-5.1-codex";

function lockedTarget(overrides: Partial<ResolvedComboTarget> = {}): ResolvedComboTarget {
  return {
    kind: "model",
    stepId: "step-1",
    executionKey: "codex/gpt-5.1-codex",
    modelStr: MODEL,
    provider: PROVIDER,
    providerId: null,
    connectionId: CONNECTION_ID,
    weight: 1,
    label: null,
    ...overrides,
  };
}

test.after(() => {
  clearAllModelLockouts();
  resetAllCircuitBreakers();
});

test("pinned-model-unavailable response is a non-retryable 400 carrying a stable code", async () => {
  const response = createPinnedModelUnavailableResponse();
  assert.equal(response.status, 400, "must be a client (non-retryable) error, not a 503");

  const body = (await response.json()) as {
    error: { message: string; type: string; code: string };
  };
  assert.equal(body.error.code, NATIVE_CODEX_PINNED_MODEL_UNAVAILABLE_CODE);
  assert.equal(body.error.type, "invalid_request_error");
  assert.match(body.error.message, /cannot switch providers or models/);
});

test("an empty pinned set is never treated as unusable", async () => {
  assert.equal(
    await areAllPinnedTargetsModelScopedUnusable({ pinnedTargets: [], comboName: "c", body: {} }),
    false
  );
});

test("all-model-locked pinned targets are model-scoped unusable, so the turn terminates", async () => {
  lockModel(PROVIDER, CONNECTION_ID, MODEL, "rate_limit", 60_000);
  assert.equal(
    await areAllPinnedTargetsModelScopedUnusable({
      pinnedTargets: [lockedTarget()],
      comboName: "c",
      body: {},
    }),
    true
  );
});

test("one usable sibling keeps the pinned turn on the normal dispatch path", async () => {
  // First candidate is locked, the sibling is healthy → NOT all unusable.
  lockModel(PROVIDER, CONNECTION_ID, MODEL, "rate_limit", 60_000);
  assert.equal(
    await areAllPinnedTargetsModelScopedUnusable({
      pinnedTargets: [lockedTarget(), lockedTarget({ connectionId: "conn-pin-2" })],
      comboName: "c",
      body: {},
    }),
    false
  );
});

test("a transient provider state (circuit breaker OPEN) is not model-scoped", async () => {
  // The pinned model may still recover once the provider recovers, so this must NOT
  // terminate the turn — the normal retry/dispatch path has to stay in play.
  const breaker = getCircuitBreaker(PROVIDER);
  for (let i = 0; i < 10 && breaker.getStatus().state !== "OPEN"; i += 1) breaker._onFailure();
  assert.equal(breaker.getStatus().state, "OPEN", "precondition: breaker is OPEN");

  assert.equal(
    await isPinnedTargetModelScopedUnusable({
      target: lockedTarget(),
      comboName: "c",
      body: {},
    }),
    false
  );
});

test("a healthy pinned target is not model-scoped unusable", async () => {
  clearAllModelLockouts();
  resetAllCircuitBreakers();
  assert.equal(
    await isPinnedTargetModelScopedUnusable({
      target: lockedTarget(),
      comboName: "c",
      body: {},
    }),
    false
  );
});

test("combo.ts terminates the pinned turn on 400 (not a retryable 409) and releases the quota-share slot", () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, "../src/services/combo.ts"),
    "utf8"
  );

  assert.match(
    source,
    /areAllPinnedTargetsModelScopedUnusable\(\{/,
    "combo.ts must consult the model-scoped usability check for pinned targets"
  );
  // Both early-exit branches (target gone / model-scoped unusable) return the 400.
  const unavailableReturns = source.match(/return createPinnedModelUnavailableResponse\(\);/g) ?? [];
  assert.equal(unavailableReturns.length, 2, "both pinned-unavailable early exits must return 400");
  assert.doesNotMatch(
    source,
    /409,\s*\n?\s*"The pinned native Codex turn target is no longer available/,
    "the old retryable 409 early exit must be gone"
  );
  // The quota-share winner slot reserved during ordering must be released on both exits.
  const pinBlockStart = source.indexOf("if (activeNativeTurnPin) {");
  const pinBlockEnd = source.indexOf("const comboAttemptOrder", pinBlockStart);
  assert.ok(pinBlockStart >= 0 && pinBlockEnd > pinBlockStart, "pinned-turn block must exist");
  const pinBlock = source.slice(pinBlockStart, pinBlockEnd);
  const releaseCalls = pinBlock.match(/targetResolution\.quotaShareRelease\?\.\(\);/g) ?? [];
  assert.equal(releaseCalls.length, 2, "both pinned-unavailable early exits must release the slot");
});
