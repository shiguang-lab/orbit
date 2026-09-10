import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_EFFORT_VALUES,
  effortRequestSchema,
  normalizeEffort,
  normalizeReasoningRequest,
} from "../src/reasoning-effort.ts";

test("max is canonical while extra remains the xhigh UI synonym", () => {
  assert.deepEqual([...CANONICAL_EFFORT_VALUES], [
    "none",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
  ]);
  assert.equal(normalizeEffort("MAX"), "max");
  assert.equal(normalizeEffort("extra"), "xhigh");
  assert.equal(effortRequestSchema.parse("MAX"), "max");
  assert.equal(
    (normalizeReasoningRequest({ effort: "max" }) as Record<string, unknown>).reasoning_effort,
    "max",
  );
});
