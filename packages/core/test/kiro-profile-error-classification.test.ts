import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProviderError,
  PROVIDER_ERROR_TYPES,
} from "../src/domain/providerErrorClassifier.ts";

test("Kiro missing profile ARN 403 remains recoverable", () => {
  const body = { message: "User is not authorized to make this call" };
  assert.equal(
    classifyProviderError(403, body, "kiro"),
    PROVIDER_ERROR_TYPES.PROJECT_ROUTE_ERROR
  );
  assert.equal(
    classifyProviderError(403, body, "amazon-q"),
    PROVIDER_ERROR_TYPES.PROJECT_ROUTE_ERROR
  );
});

test("Kiro carve-out stays message and provider scoped", () => {
  assert.equal(
    classifyProviderError(403, "Forbidden", "kiro"),
    PROVIDER_ERROR_TYPES.FORBIDDEN
  );
  assert.equal(
    classifyProviderError(403, "User is not authorized to make this call", "claude"),
    PROVIDER_ERROR_TYPES.FORBIDDEN
  );
});
