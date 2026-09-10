import assert from "node:assert/strict";
import test from "node:test";
import {
  describeMalformedNonStream,
  detectMalformedNonStream,
} from "../src/utils/diagnostics.js";

test("failed Responses body surfaces its trimmed upstream error message", () => {
  const failed = {
    object: "response",
    status: "failed",
    output: [],
    error: { code: "server_error", message: "  Gemini 503: overloaded  " },
  };
  const reason = detectMalformedNonStream(failed);
  assert.equal(reason, "empty_choices");
  assert.deepEqual(describeMalformedNonStream(failed, reason), {
    message: "upstream reported a failed response: Gemini 503: overloaded",
    code: "upstream_response_failed",
    type: "upstream_response_error",
  });
});

test("failed Responses body keeps the generic diagnostic without a usable message", () => {
  assert.deepEqual(
    describeMalformedNonStream(
      { object: "response", status: "failed", output: [], error: { message: "  " } },
      "empty_choices"
    ),
    {
      message: "upstream reported a failed response without usable output",
      code: "upstream_response_failed",
      type: "upstream_response_error",
    }
  );
});
