import assert from "node:assert/strict";
import test from "node:test";

import { toSafeMcpErrorMessage } from "../src/mcp-server/errorMessage.ts";

test("MCP errors redact credentials and source paths", () => {
  const safe = toSafeMcpErrorMessage(
    new Error("failed with sk-secret123456789 at /Users/private/source.ts")
  );
  assert.equal(safe.includes("sk-secret123456789"), false);
  assert.equal(safe.includes("/Users/private"), false);
});

test("MCP error projection survives hostile Error accessors", () => {
  const hostile = Object.create(Error.prototype);
  Object.defineProperty(hostile, "message", {
    get() {
      throw new Error("getter escaped");
    },
  });
  assert.equal(toSafeMcpErrorMessage(hostile, "safe fallback"), "safe fallback");
});
