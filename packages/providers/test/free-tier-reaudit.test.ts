import assert from "node:assert/strict";
import test from "node:test";

import { FREE_MODEL_BUDGETS } from "../src/catalog/freeModelCatalog.ts";
import { REGISTRY } from "../src/config/providers/index.ts";

const rows = (provider: string) => FREE_MODEL_BUDGETS.filter((row) => row.provider === provider);
const ids = (provider: string) => rows(provider).map((row) => row.modelId).sort();

test("Gemini and Ollama Cloud remain free but do not claim unpublished token grants", () => {
  for (const provider of ["gemini", "ollama-cloud"]) {
    assert.ok(rows(provider).length > 0);
    assert.ok(
      rows(provider).every(
        (row) => row.monthlyTokens === 0 && row.freeType === "recurring-uncapped"
      )
    );
  }
});

test("Groq uses five independent current-model 200K TPD caps", () => {
  assert.deepEqual(ids("groq"), [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-safeguard-20b",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
  ]);
  assert.ok(
    rows("groq").every(
      (row) => row.monthlyTokens === 6_000_000 && row.poolKey === null && row.hardStopGuaranteed
    )
  );
  const registryIds = new Set(REGISTRY.groq.models.map((model) => model.id));
  for (const id of ids("groq")) assert.equal(registryIds.has(id), true, id);
});

test("Nara free plan is one 7M/day pool across the eight routable plan models", () => {
  const expected = [
    "agnes-2.0-flash",
    "agnes-2.5-flash",
    "laguna-s-2.1",
    "minimax-m3-free",
    "mistral-large",
    "mistral-medium-3-5",
    "qwen3.8-27b",
    "stepfun-3.7-flash",
  ];
  assert.deepEqual(ids("nara"), expected);
  assert.ok(
    rows("nara").every(
      (row) => row.monthlyTokens === 210_000_000 && row.poolKey === "nara-free"
    )
  );
  assert.deepEqual(REGISTRY.nara.models.map((model) => model.id).sort(), expected);
});
