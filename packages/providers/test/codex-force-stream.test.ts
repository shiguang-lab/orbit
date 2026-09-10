import assert from "node:assert/strict";
import test from "node:test";

import { codexProvider } from "../src/config/providers/registry/codex/index.ts";

test("Codex forces its always-streaming Responses backend for non-stream callers", () => {
  assert.equal(codexProvider.forceStream, true);
});
