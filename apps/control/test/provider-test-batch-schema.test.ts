import assert from "node:assert/strict";
import test from "node:test";

import { providersBatchTestSchema } from "../src/providers/runtime/provider-test-batch-schema.js";

test("provider batch schema accepts self-contained modes", () => {
  for (const mode of ["all", "oauth", "free", "compatible", "ide"] as const) {
    assert.equal(providersBatchTestSchema.safeParse({ mode }).success, true);
  }
});

test("provider batch schema requires the selector for scoped modes", () => {
  assert.equal(providersBatchTestSchema.safeParse({ mode: "provider" }).success, false);
  assert.equal(
    providersBatchTestSchema.safeParse({ mode: "provider", providerId: "openai" }).success,
    true,
  );
  assert.equal(providersBatchTestSchema.safeParse({ mode: "selected", connectionIds: [] }).success, false);
  assert.equal(
    providersBatchTestSchema.safeParse({ mode: "selected", connectionIds: ["connection"] }).success,
    true,
  );
});

test("provider batch schema rejects unknown modes and oversized selections", () => {
  assert.equal(providersBatchTestSchema.safeParse({ mode: "unknown" }).success, false);
  assert.equal(
    providersBatchTestSchema.safeParse({
      mode: "selected",
      connectionIds: Array.from({ length: 101 }, (_, index) => String(index)),
    }).success,
    false,
  );
});
