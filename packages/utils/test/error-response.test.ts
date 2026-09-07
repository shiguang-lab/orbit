import assert from "node:assert/strict";
import test from "node:test";
import {
  buildErrorBody,
  errorResponse,
  modelCooldownResponse,
  providerCircuitOpenResponse,
  unavailableResponse,
} from "../src/errors/error-response.js";

test("buildErrorBody preserves the OpenAI-compatible envelope and classification", () => {
  assert.deepEqual(buildErrorBody(404, "missing"), {
    error: {
      message: "missing",
      type: "invalid_request_error",
      code: "model_not_found",
      reason: undefined,
    },
  });
  assert.deepEqual(buildErrorBody(424, "failed", undefined, { code: "dependency_failed" }), {
    error: {
      message: "failed",
      type: "invalid_request_error",
      code: "dependency_failed",
      reason: undefined,
    },
  });
});

test("errorResponse preserves status, content type, and sanitized body", async () => {
  const response = errorResponse(500, "boom\n    at /private/service.ts:1:1");
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: {
      message: "boom",
      type: "server_error",
      code: "internal_server_error",
    },
  });
});

test("retry responses preserve protocol headers and payload shapes", async () => {
  const unavailable = unavailableResponse(503, "busy", 2.1, "reset after 3s");
  assert.equal(unavailable.headers.get("retry-after"), "3");
  assert.deepEqual(await unavailable.json(), { error: { message: "busy (reset after 3s)" } });

  const circuit = providerCircuitOpenResponse("example", 4);
  assert.equal(circuit.status, 503);
  assert.equal(circuit.headers.get("retry-after"), "4");
  assert.equal(circuit.headers.get("x-shiguanggateway-provider-breaker"), "open");
  assert.deepEqual(await circuit.json(), {
    error: {
      message: "Provider example circuit breaker is open",
      type: "server_error",
      code: "provider_circuit_open",
      provider: "example",
      retry_after: 4,
    },
  });

  const cooldown = modelCooldownResponse({
    model: " model-a ",
    retryAfter: 5,
    retryAfterAt: "2026-09-06T00:00:00.000Z",
    credentialsCoolingCount: 2,
  });
  assert.equal(cooldown.status, 429);
  assert.equal(cooldown.headers.get("retry-after"), "5");
  assert.deepEqual(await cooldown.json(), {
    error: {
      message: "All credentials for model model-a are cooling down",
      type: "rate_limit_error",
      code: "model_cooldown",
      model: "model-a",
      reset_seconds: 5,
      retry_after: "2026-09-06T00:00:00.000Z",
      credentials_cooling: 2,
    },
  });
});
