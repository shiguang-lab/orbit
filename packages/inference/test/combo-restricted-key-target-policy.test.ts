import assert from "node:assert/strict";
import test from "node:test";

import { comboTargetPassesKeyModelPolicy } from "../src/handlers/chat/comboTargetKeyPolicy.ts";

const KEY = "sk-test";
const COMBO = "combo-deepseek-v4-flash";
const INNER = "deepseek/deepseek-v4-flash";

test("combo-name allow-list admits the combo's inner targets", async () => {
  let calls = 0;
  const allowed = await comboTargetPassesKeyModelPolicy({
    apiKey: KEY,
    apiKeyInfo: { modelAccessMode: "restricted", allowedModels: [COMBO] },
    requestedModel: COMBO,
    targetModel: INNER,
    isModelAllowedForKey: async () => {
      calls += 1;
      return false;
    },
  });

  assert.equal(allowed, true);
  assert.equal(calls, 0);
});

test("provider-prefix allow-list still filters each inner target", async () => {
  const checker = async (_key: string, model: string) => model.startsWith("deepseek/");
  const deepseekAllowed = await comboTargetPassesKeyModelPolicy({
    apiKey: KEY,
    apiKeyInfo: { modelAccessMode: "restricted", allowedModels: ["deepseek/*"] },
    requestedModel: COMBO,
    targetModel: INNER,
    isModelAllowedForKey: checker,
  });
  const anthropicAllowed = await comboTargetPassesKeyModelPolicy({
    apiKey: KEY,
    apiKeyInfo: { modelAccessMode: "restricted", allowedModels: ["deepseek/*"] },
    requestedModel: COMBO,
    targetModel: "anthropic/claude-sonnet-5",
    isModelAllowedForKey: checker,
  });

  assert.equal(deepseekAllowed, true);
  assert.equal(anthropicAllowed, false);
});

test("combo-name allow-list does not bypass Orbit block/non-public restrictions", async () => {
  for (const apiKeyInfo of [
    { modelAccessMode: "restricted", allowedModels: [COMBO], blockedModels: [INNER] },
    { modelAccessMode: "restricted", allowedModels: [COMBO], disableNonPublicModels: true },
  ]) {
    let calls = 0;
    const allowed = await comboTargetPassesKeyModelPolicy({
      apiKey: KEY,
      apiKeyInfo,
      requestedModel: COMBO,
      targetModel: INNER,
      effort: "high",
      isModelAllowedForKey: async (_key, _model, effort) => {
        calls += 1;
        assert.equal(effort, "high");
        return false;
      },
    });

    assert.equal(allowed, false);
    assert.equal(calls, 1);
  }
});

test("unrestricted key skips the target gate", async () => {
  let calls = 0;
  const allowed = await comboTargetPassesKeyModelPolicy({
    apiKey: KEY,
    apiKeyInfo: { modelAccessMode: "all", allowedModels: [] },
    requestedModel: COMBO,
    targetModel: INNER,
    isModelAllowedForKey: async () => {
      calls += 1;
      return false;
    },
  });

  assert.equal(allowed, true);
  assert.equal(calls, 0);
});
