import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_COMBOS_ACCESS_RULE,
  comboAccessSaveValue,
  editableComboAccessRules,
  listUnrenderableComboAccessRules,
} from "../src/features/api-manager/combo-access.ts";

const loaded = [{ name: "cb-primary" }, { name: "cb-fallback" }];

test("unrenderable combo access rules survive in stored order", () => {
  const stored = ["rt-special", "cb-primary", "deleted-combo", ALL_COMBOS_ACCESS_RULE];
  assert.deepEqual(listUnrenderableComboAccessRules(stored, loaded), [
    "rt-special",
    "deleted-combo",
  ]);
  assert.deepEqual(editableComboAccessRules(stored), [
    "rt-special",
    "cb-primary",
    "deleted-combo",
  ]);
});

test("all and restricted modes serialize without losing preserved rules", () => {
  const preserved = ["rt-special", "deleted-combo"];
  assert.deepEqual(comboAccessSaveValue("all", preserved), [ALL_COMBOS_ACCESS_RULE]);
  assert.deepEqual(comboAccessSaveValue("restricted", preserved), preserved);
});
