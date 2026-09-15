import assert from "node:assert/strict";
import test from "node:test";
import { getSelectedComboModel, getComboModelLabel, getComboProviderScope } from "../src/features/combos/combo-model-scope.ts";

const id = "openai-compatible-cliproxy-nas";
const providers = [{ providerId: id, prefix: "cpa-nas", models: [
  { id: "gpt-5.6-sol", qualifiedModel: "cpa-nas/gpt-5.6-sol" },
  { id: "vendor/model", qualifiedModel: "cpa-nas/vendor/model" },
] }];

test("adding the bare picker value uses the API qualified model, including namespaced models", () => {
  assert.equal(getSelectedComboModel(id, "gpt-5.6-sol", providers), "cpa-nas/gpt-5.6-sol");
  assert.equal(getSelectedComboModel(id, "vendor/model", providers), "cpa-nas/vendor/model");
});
test("existing steps and provider badges use the node prefix without mutating identity", () => {
  const step = { providerId: id, model: id + "/gpt-5.6-sol", connectionId: "pinned-account" };
  assert.equal(getComboModelLabel(step.model, step.providerId, providers), "cpa-nas/gpt-5.6-sol");
  assert.equal(getComboProviderScope(step.providerId, providers), "cpa-nas");
  assert.equal(step.providerId, id);
  assert.equal(step.connectionId, "pinned-account");
  assert.equal(getComboModelLabel("cpa-nas/gpt-5.6-sol", id, providers), "cpa-nas/gpt-5.6-sol");
});
test("unknown providers and unrelated qualified paths remain intact", () => {
  assert.equal(getComboModelLabel("other/model", "unknown", []), "other/model");
  assert.equal(getComboModelLabel("model", "unknown", []), "unknown/model");
});
