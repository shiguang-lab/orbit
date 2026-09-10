import assert from "node:assert/strict";
import test from "node:test";

import { classifyProviderBreakerResult } from "../src/handlers/chatPredicates.ts";

test("single-model resolved 503 is a provider breaker failure", () => {
  assert.equal(
    classifyProviderBreakerResult(
      { success: false, status: 503, error: "service unavailable" },
      false,
      false
    ),
    "failure"
  );
});

test("single-model success is recorded as success", () => {
  assert.equal(
    classifyProviderBreakerResult({ success: true, status: 200 }, false, false),
    "success"
  );
});

test("request-scoped and model-capacity failures are ignored", () => {
  assert.equal(
    classifyProviderBreakerResult(
      { success: false, status: 502, errorCode: "proxy_unreachable" },
      false,
      false
    ),
    "ignore"
  );
  assert.equal(
    classifyProviderBreakerResult(
      { success: false, status: 529, error: "overloaded_error" },
      false,
      false
    ),
    "ignore"
  );
});

test("combo and live-combo-test dispatches retain their own accounting", () => {
  for (const result of [
    { success: true, status: 200 },
    { success: false, status: 503 },
  ]) {
    assert.equal(classifyProviderBreakerResult(result, true, false), "ignore");
    assert.equal(classifyProviderBreakerResult(result, false, true), "ignore");
  }
});
