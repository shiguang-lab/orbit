import assert from "node:assert/strict";
import test from "node:test";

import { FREE_TIER_BUDGETS } from "../src/config/freeTierCatalog.ts";

test("legacy free-tier totals mirror the re-audited quantified providers", () => {
  assert.equal(FREE_TIER_BUDGETS.gemini, undefined);
  assert.equal(FREE_TIER_BUDGETS["ollama-cloud"], undefined);
  assert.equal(FREE_TIER_BUDGETS.cerebras, undefined);
  assert.equal(FREE_TIER_BUDGETS.groq, 30_000_000);
  assert.equal(FREE_TIER_BUDGETS.nara, 210_000_000);
});
