import assert from "node:assert/strict";
import test from "node:test";

import {
  projectProviderValidationResultForPublicResponse,
  toValidationErrorResult,
} from "../src/services/providerValidation/transport.ts";

test("provider validation errors and warnings are projected before public use", () => {
  const projected = projectProviderValidationResultForPublicResponse({
    valid: false,
    error: "invalid sk-secret123456789 at /Users/private/source.ts",
    warning: "Bearer private-token",
    method: "models",
  });
  const serialized = JSON.stringify(projected);
  assert.equal(serialized.includes("sk-secret123456789"), false);
  assert.equal(serialized.includes("/Users/private"), false);
  assert.equal(serialized.includes("private-token"), false);
  assert.equal(projected.method, "models");
});

test("validation exception mapping survives hostile message accessors", () => {
  const hostile = Object.create(Error.prototype);
  Object.defineProperty(hostile, "message", {
    get() {
      throw new Error("getter escaped");
    },
  });
  assert.deepEqual(toValidationErrorResult(hostile), {
    valid: false,
    error: "Validation failed",
    unsupported: false,
  });
});
