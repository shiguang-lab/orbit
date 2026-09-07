import assert from "node:assert/strict";
import test from "node:test";

import {
  computeComboCapabilities,
  projectCombo,
  projectComboStep,
} from "../src/combos/runtime/project-combo.js";

test("combo projection strips routing secrets while preserving account pin state", () => {
  assert.deepEqual(
    projectComboStep({
      kind: "model",
      model: "provider/model",
      providerId: "provider",
      connectionId: "secret-connection",
      weight: 100,
      label: "internal",
    }),
    {
      kind: "model",
      model: "provider/model",
      providerId: "provider",
      accountPinned: true,
    },
  );
  assert.deepEqual(projectComboStep({ kind: "combo-ref", comboName: "fallback", connectionId: "secret" }), {
    kind: "combo-ref",
    comboName: "fallback",
  });
  assert.equal(projectComboStep({ kind: "model" }), null);
});

test("combo projection validates identity and uses a stable default strategy", () => {
  assert.equal(projectCombo({ name: "   ", models: [] }), null);
  assert.deepEqual(projectCombo({ name: " primary ", description: "Public", models: [] }), {
    name: "primary",
    strategy: "priority",
    description: "Public",
    models: [],
  });
});

test("combo capabilities use the weakest concrete model and explicit cache protection", () => {
  const capabilities = computeComboCapabilities(
    {
      models: [
        { kind: "model", model: "vision-reasoning" },
        { kind: "model", model: "text-reasoning" },
      ],
      context_cache_protection: true,
    },
    (model) => ({ supportsVision: model === "vision-reasoning", reasoning: true }),
  );
  assert.deepEqual(capabilities, { multimodal: false, reasoning: true, caching: true });
});

test("nested combos conservatively disable inferred model capabilities", () => {
  assert.deepEqual(
    computeComboCapabilities(
      { models: [{ kind: "model", model: "capable" }, { kind: "combo-ref", comboName: "nested" }] },
      () => ({ supportsVision: true, reasoning: true }),
    ),
    { multimodal: false, reasoning: false, caching: false },
  );
});
