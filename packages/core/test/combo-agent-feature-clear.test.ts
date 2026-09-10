import assert from "node:assert/strict";
import test from "node:test";

import { updateComboSchema } from "../src/shared/validation/schemas/combo.ts";
import { createCombo, getComboById, updateCombo } from "../src/lib/db/combos.ts";
import { resetDbInstance } from "../src/lib/db/core.ts";

test.after(() => resetDbInstance());

test("combo update schema accepts explicit null for each clearable agent feature", () => {
  const parsed = updateComboSchema.parse({
    system_message: null,
    tool_filter_regex: null,
    context_cache_protection: null,
  });
  assert.equal(parsed.system_message, null);
  assert.equal(parsed.tool_filter_regex, null);
  assert.equal(parsed.context_cache_protection, null);
});

test("null still counts as an update field", () => {
  assert.doesNotThrow(() => updateComboSchema.parse({ context_cache_protection: null }));
  assert.throws(() => updateComboSchema.parse({}), /No valid fields to update/);
});

test("explicit null removes persisted agent features while omission preserves them", async () => {
  const created = await createCombo({
    name: `agent-clear-${Date.now()}`,
    strategy: "priority",
    models: ["openai/gpt-4.1"],
    system_message: "concise",
    tool_filter_regex: "^read_",
    context_cache_protection: true,
  });

  const unchanged = await updateCombo(created.id as string, { description: "note" });
  assert.equal(unchanged?.system_message, "concise");
  assert.equal(unchanged?.context_cache_protection, true);

  const cleared = await updateCombo(created.id as string, {
    system_message: null,
    tool_filter_regex: null,
    context_cache_protection: null,
  });
  assert.equal(cleared?.system_message, undefined);
  assert.equal(cleared?.tool_filter_regex, undefined);
  assert.notEqual(cleared?.context_cache_protection, true);

  const reread = await getComboById(created.id as string);
  assert.equal(reread?.system_message, undefined);
  assert.equal(reread?.tool_filter_regex, undefined);
  assert.notEqual(reread?.context_cache_protection, true);
});
