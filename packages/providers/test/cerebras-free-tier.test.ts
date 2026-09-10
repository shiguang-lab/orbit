/**
 * Port of upstream tests/unit/cerebras-free-tier-11773.test.ts (#78 sync).
 * Cerebras retired the no-card 1M tokens/day trial; the signup is a one-time
 * $5 credit gated on a payment method (30-day validity). It must stay
 * catalogued but must not be treated as a recurring zero-cost free tier.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { LEGACY_FREE_PROVIDERS } from "../../contracts/src/tier-config";
import { DEFAULT_PRICING } from "../../core/src/shared/constants/pricing";
import { APIKEY_PROVIDERS_INFERENCE } from "../src/catalog/definitions/apikey/inference-hosts";
import { FREE_MODEL_BUDGETS } from "../src/catalog/freeModelCatalog";
import { FREE_TIER_BUDGETS } from "../../inference/src/config/freeTierCatalog";
import { classifyTier } from "../../inference/src/services/tierResolver";
import { PROVIDER_TIER } from "../../inference/src/services/tierTypes";

const CEREBRAS_MODELS = ["zai-glm-4.7", "gpt-oss-120b"] as const;

test("#11773 cerebras stays catalogued, but not as a recurring zero-cost tier", () => {
  const entry = (APIKEY_PROVIDERS_INFERENCE as Record<string, { hasFree?: boolean }>).cerebras;
  assert.ok(entry, "APIKEY_PROVIDERS_INFERENCE.cerebras must remain registered");
  assert.equal(entry.hasFree, true);
  assert.equal(Object.hasOwn(FREE_TIER_BUDGETS, "cerebras"), false);
  assert.equal(LEGACY_FREE_PROVIDERS.includes("cerebras"), false);
});

test("#11773 cerebras freeNote describes the $5 card-gated signup credit", () => {
  const note = (APIKEY_PROVIDERS_INFERENCE as Record<string, { freeNote?: string }>).cerebras
    .freeNote;
  assert.ok(note, "cerebras freeNote must exist");
  assert.match(note, /\$5/);
  assert.match(note, /30.?day|30 days/i);
  assert.match(note, /payment method|credit card/i);
  assert.equal(/1M tokens\/day|30K TPM/.test(note), false);
});

test("#11773 cerebras catalog rows are one-time signup credits, not a hard-stop free trial", () => {
  const rows = FREE_MODEL_BUDGETS.filter((row) => row.provider === "cerebras");
  assert.ok(rows.length >= CEREBRAS_MODELS.length, "catalog must keep the live Cerebras models");
  for (const modelId of CEREBRAS_MODELS) {
    const row = rows.find((entry) => entry.modelId === modelId);
    assert.ok(row, `missing catalog row for ${modelId}`);
    assert.equal(row.freeType, "one-time-initial");
    assert.equal(row.monthlyTokens, 0);
    assert.notEqual(row.hardStopGuaranteed, true);
  }
});

test("#11773 cerebras pricing is not zero so classifyTier cannot file it as free", () => {
  const pricing = (DEFAULT_PRICING as Record<
    string,
    Record<string, { input: number; output: number }>
  >).cerebras;
  assert.ok(pricing, "cerebras pricing table must exist");
  for (const modelId of CEREBRAS_MODELS) {
    const row = pricing[modelId];
    assert.ok(row, `missing pricing row for ${modelId}`);
    assert.ok(row.input > 0 || row.output > 0, `${modelId} must keep paid rates`);
    const result = classifyTier("cerebras", modelId);
    assert.notEqual(result.tier, PROVIDER_TIER.FREE);
  }
});
