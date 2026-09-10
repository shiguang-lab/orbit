/**
 * #12233 — local host execution errors must not count as upstream provider failures.
 *
 * A missing local binary (ENOENT), a permission failure (EACCES), a broken pipe (EPIPE) or a
 * child-process exit error originates in OUR process spawning a local CLI/helper — not in the
 * provider. Treating it as a provider failure opened provider circuit breakers and cooled down
 * healthy connections, so `isLocalExecutionError` now guards every breaker-trip / connection-disable
 * predicate alongside the existing `isLocalStreamLifecycleError`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { isLocalExecutionError } from "@orbit/core/resilience/circuit-breaker";
import {
  shouldRecordProviderBreakerFailure,
  shouldSkipConnDisable,
} from "../src/services/combo/comboPredicates.js";
import { shouldTripProviderBreakerForResult } from "../src/handlers/chatPredicates.js";

test("isLocalExecutionError detects local process failures by errno code", () => {
  for (const code of ["ENOENT", "EACCES", "EPIPE", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"]) {
    assert.equal(isLocalExecutionError({ code }), true, code);
  }
});

test("isLocalExecutionError detects local process failures by message", () => {
  assert.equal(isLocalExecutionError("spawn orb codex ENOENT"), true);
  assert.equal(isLocalExecutionError("some-cli: command not found"), true);
  assert.equal(
    isLocalExecutionError("'orb' is not recognized as an internal or external command"),
    true
  );
  assert.equal(isLocalExecutionError("child process exited with code 127"), true);
  assert.equal(isLocalExecutionError("local host execution error"), true);
});

test("isLocalExecutionError ignores genuine provider failures and empty input", () => {
  assert.equal(isLocalExecutionError(null), false);
  assert.equal(isLocalExecutionError(undefined), false);
  assert.equal(isLocalExecutionError(""), false);
  assert.equal(isLocalExecutionError({}), false);
  assert.equal(isLocalExecutionError({ statusCode: 502, message: "upstream unavailable" }), false);
  assert.equal(isLocalExecutionError("ECONNREFUSED 127.0.0.1:443"), false);
});

test("shouldRecordProviderBreakerFailure skips a local execution error", () => {
  const base = { isStreamReadinessFailure: false, status: 502, sameProviderNext: false };
  assert.equal(
    shouldRecordProviderBreakerFailure({ ...base, error: { code: "ENOENT" } }),
    false,
    "a local spawn failure must not trip the provider breaker"
  );
  assert.equal(
    shouldRecordProviderBreakerFailure({ ...base, error: "upstream returned 502" }),
    true,
    "a genuine upstream failure still trips"
  );
});

test("shouldSkipConnDisable skips a local execution error", () => {
  assert.equal(
    shouldSkipConnDisable({ status: 502, error: { code: "EPIPE" } }, false, false, "codex"),
    true
  );
  assert.equal(
    shouldSkipConnDisable({ status: 502, error: "upstream returned 502" }, false, false, "codex"),
    false
  );
});

test("shouldTripProviderBreakerForResult skips a local execution error", () => {
  assert.equal(
    shouldTripProviderBreakerForResult({ status: 502, error: { code: "ENOENT" } }, false, false),
    false
  );
  assert.equal(
    shouldTripProviderBreakerForResult({ status: 502, error: "upstream returned 502" }, false, false),
    true
  );
});
