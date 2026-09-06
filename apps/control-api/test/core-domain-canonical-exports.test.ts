import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrCreateApiKey,
  resolveApiKey,
} from "@shiguang-gateway/core-domain/shared/api-key-resolver";
import {
  formatValidationMessage,
  isValidationFailure,
  validateBody,
  validatedJsonBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { z } from "zod";

test("resolves the canonical API-key resolver export", async () => {
  assert.equal(typeof getOrCreateApiKey, "function");
  assert.equal(await resolveApiKey(undefined, "sk-explicit"), "sk-explicit");
});

test("resolves the canonical validation helpers export", () => {
  const schema = z.object({ name: z.string() }).strict();
  assert.deepEqual(validateBody(schema, { name: "orbiot" }), {
    success: true,
    data: { name: "orbiot" },
  });

  const failure = validateBody(schema, { name: 42 });
  assert.equal(isValidationFailure(failure), true);
  if (isValidationFailure(failure)) {
    assert.equal(formatValidationMessage(failure.error), "name: Invalid input: expected string, received number");
  }
  assert.equal(typeof validatedJsonBody, "function");
});
