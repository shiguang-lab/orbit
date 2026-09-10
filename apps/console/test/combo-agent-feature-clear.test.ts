import assert from "node:assert/strict";
import test from "node:test";

import { buildComboAgentFeaturePatch } from "../src/features/combos/combo-agent-features.ts";

test("editing sends null for cleared agent features", () => {
  assert.deepEqual(
    buildComboAgentFeaturePatch({
      systemMessage: " ",
      toolFilterRegex: "",
      contextCacheProtection: false,
      isEdit: true,
    }),
    {
      system_message: null,
      tool_filter_regex: null,
      context_cache_protection: null,
    }
  );
});

test("creating omits empty agent features", () => {
  assert.deepEqual(
    buildComboAgentFeaturePatch({
      systemMessage: "",
      toolFilterRegex: "",
      contextCacheProtection: false,
      isEdit: false,
    }),
    {}
  );
});

test("set values are trimmed and preserved", () => {
  assert.deepEqual(
    buildComboAgentFeaturePatch({
      systemMessage: "  concise  ",
      toolFilterRegex: " ^read_ ",
      contextCacheProtection: true,
      isEdit: true,
    }),
    {
      system_message: "concise",
      tool_filter_regex: "^read_",
      context_cache_protection: true,
    }
  );
});
