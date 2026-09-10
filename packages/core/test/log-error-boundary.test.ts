import assert from "node:assert/strict";
import test from "node:test";

import {
  protectErrorPayloadForLog,
  protectPayloadForLog,
  sanitizeErrorFramesFromLogChunks,
} from "../src/lib/logPayloads.ts";
import { sanitizeErrorForLog } from "../src/lib/usage/callLogs/format.ts";

test("failed response logs sanitize diagnostics while preserving partial output", () => {
  const protectedPayload = protectErrorPayloadForLog({
    type: "response.failed",
    response: {
      status: "failed",
      message: "failed with sk-secret123456789 at /Users/private/source.ts",
      output: [{ type: "output_text", text: "useful partial answer" }],
      error: { accessToken: "private-token", reason: "denied" },
    },
  });
  const serialized = JSON.stringify(protectedPayload);
  assert.match(serialized, /useful partial answer/);
  assert.equal(serialized.includes("sk-secret123456789"), false);
  assert.equal(serialized.includes("/Users/private"), false);
  assert.equal(serialized.includes("private-token"), false);
});

test("fragmented SSE error frames are reassembled and sanitized", () => {
  const chunks = sanitizeErrorFramesFromLogChunks([
    "event: error\nda",
    'ta: {"error":{"message":"sk-secret123456789 at /Users/private/source.ts"}}\n\n',
  ]);
  const serialized = chunks.join("");
  assert.equal(serialized.includes("sk-secret123456789"), false);
  assert.equal(serialized.includes("/Users/private"), false);
  assert.match(serialized, /event: error/);
});

test("challenge tokens and Error stacks are removed from stored log projections", () => {
  assert.equal(
    JSON.stringify(protectPayloadForLog({ turnstile_token: "challenge-secret" })).includes(
      "challenge-secret"
    ),
    false
  );
  const error = new Error("failed with sk-secret123456789");
  error.stack = "Error: failed\n    at fn (/Users/private/source.ts:1:2)";
  const projected = JSON.stringify(sanitizeErrorForLog(error));
  assert.equal(projected.includes("sk-secret123456789"), false);
  assert.equal(projected.includes("/Users/private"), false);
});
