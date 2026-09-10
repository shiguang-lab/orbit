import assert from "node:assert/strict";
import test from "node:test";

import { resolvePassthroughModelOverride } from "../src/services/passthroughModelRouting.ts";

test("combo redirect into passthrough provider preserves the original qualified model", () => {
  assert.equal(
    resolvePassthroughModelOverride({
      provider: "cline",
      resolvedProvider: "openai",
      originalModel: "cline/gpt-4o-mini",
    }),
    "cline/gpt-4o-mini"
  );
});

test("ordinary and non-passthrough routes keep normal model resolution", () => {
  assert.equal(
    resolvePassthroughModelOverride({
      provider: "openai",
      resolvedProvider: "openai",
      originalModel: "openai/gpt-4o-mini",
    }),
    null
  );
  assert.equal(
    resolvePassthroughModelOverride({
      provider: "claude",
      resolvedProvider: "openai",
      originalModel: "claude/sonnet",
    }),
    null
  );
});
