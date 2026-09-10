import assert from "node:assert/strict";
import test from "node:test";

import { resolveIncomingCorrelationId } from "../src/chat-completions/correlation.ts";

test("preserves valid caller correlation IDs", () => {
  assert.equal(resolveIncomingCorrelationId("caller-123_XYZ"), "caller-123_XYZ");
  assert.equal(resolveIncomingCorrelationId("  spaced-id  "), "spaced-id");
  assert.equal(resolveIncomingCorrelationId("a".repeat(256)), "a".repeat(256));
});

test("removes CRLF and rejects empty or oversized IDs", () => {
  assert.equal(resolveIncomingCorrelationId("evil\r\nInjected: true"), "evilInjected: true");
  assert.equal(resolveIncomingCorrelationId(null), null);
  assert.equal(resolveIncomingCorrelationId("   "), null);
  assert.equal(resolveIncomingCorrelationId("a".repeat(257)), null);
});
