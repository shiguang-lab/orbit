import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeErrorMessage } from "../src/utils/error.js";
import { shouldPassthroughUpstreamError } from "../src/utils/upstreamErrorPassthrough.js";

const leakyMessages = [
  "Incorrect API key: sk-proj-AbCdEfGhIjKlMnOpQrStUv",
  "Rejected AIza12345678901234567890123456789012345",
  "Bad eyJabcdefgh.abcdefghijklmnop.abcdefghijklmnop",
];

test("passthrough and fallback sanitizer share raw credential detection", () => {
  for (const message of leakyMessages) {
    assert.equal(shouldPassthroughUpstreamError(429, { error: { message } }), false);
    assert.notEqual(sanitizeErrorMessage(message), message);
  }
});
