import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasInvalidReasoningEffort,
  normalizeAliasEntry,
  normalizeAliasMappings,
} from "../src/cli-tools/mitm-alias.js";

test("upgrades legacy strings and drops empty or malformed entries", () => {
  assert.deepEqual(normalizeAliasEntry("  provider/model  "), { model: "provider/model" });
  assert.equal(normalizeAliasEntry("   "), null);
  assert.equal(normalizeAliasEntry(null), null);
  assert.equal(normalizeAliasEntry([]), null);
  assert.deepEqual(normalizeAliasMappings({
    legacy: " provider/legacy ",
    empty: " ",
    malformed: 42,
  }), {
    legacy: { model: "provider/legacy" },
  });
  assert.deepEqual(normalizeAliasMappings(null), {});
});

test("normalizes structured model and canonical reasoning effort values", () => {
  assert.deepEqual(normalizeAliasEntry({ model: " provider/model ", reasoningEffort: " HIGH " }), {
    model: "provider/model",
    reasoningEffort: "high",
  });
  assert.deepEqual(normalizeAliasEntry({ reasoningEffort: "extra" }), {
    reasoningEffort: "xhigh",
  });
  assert.deepEqual(normalizeAliasEntry({ reasoningEffort: "max" }), {
    reasoningEffort: "xhigh",
  });
  assert.deepEqual(normalizeAliasEntry({ model: "model", reasoningEffort: "invalid" }), {
    model: "model",
  });
  assert.equal(normalizeAliasEntry({ reasoningEffort: "invalid" }), null);
});

test("detects invalid structured efforts without rejecting legacy or empty values", () => {
  assert.equal(hasInvalidReasoningEffort({ alias: { reasoningEffort: "medium" } }), false);
  assert.equal(hasInvalidReasoningEffort({ alias: { reasoningEffort: "MAX" } }), false);
  assert.equal(hasInvalidReasoningEffort({ alias: { reasoningEffort: "" } }), false);
  assert.equal(hasInvalidReasoningEffort({ alias: "provider/model" }), false);
  assert.equal(hasInvalidReasoningEffort({ alias: { reasoningEffort: "turbo" } }), true);
  assert.equal(hasInvalidReasoningEffort({ alias: { reasoningEffort: 3 } }), true);
  assert.equal(hasInvalidReasoningEffort([]), false);
});
