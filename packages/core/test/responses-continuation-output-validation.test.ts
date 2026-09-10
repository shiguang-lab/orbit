import assert from "node:assert/strict";
import test from "node:test";
import { isUsablePreviousResponseOutput } from "../src/lib/db/responsesContinuationStore.js";

test("collector-truncated continuation output fails closed", () => {
  assert.equal(
    isUsablePreviousResponseOutput(
      { _streamed: true, _truncated: true, summary: { output: [] } },
      []
    ),
    false
  );
  assert.equal(
    isUsablePreviousResponseOutput(
      { _streamed: true, _truncated: true },
      [{ type: "message", content: "partial" }]
    ),
    false
  );
});

test("empty and bounded-truncated outputs fail closed while real output remains usable", () => {
  assert.equal(isUsablePreviousResponseOutput({}, []), false);
  assert.equal(
    isUsablePreviousResponseOutput({}, [{ _orbit_truncated_array: true }]),
    false
  );
  assert.equal(
    isUsablePreviousResponseOutput({}, [{ type: "message", role: "assistant", content: "ok" }]),
    true
  );
});
