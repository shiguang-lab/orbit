import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WEIGHTS,
  normalizeScoringWeights,
} from "../src/services/autoCombo/scoring.ts";
import { scoringWeightsSchema } from "../../core/src/shared/validation/schemas/combo.ts";
import { COMBO_SCORING_WEIGHTS } from "../../../apps/console/src/features/combos/combo-scoring-weights.ts";

function parseWeights(input: Record<string, number>) {
  const parsed = scoringWeightsSchema.parse(input);
  assert.ok(parsed);
  return parsed as Record<string, number>;
}

test("schema and console expose exactly every scorer factor", () => {
  const engineFactors = Object.keys(DEFAULT_WEIGHTS).sort();
  assert.deepEqual(
    Object.keys(parseWeights(DEFAULT_WEIGHTS as unknown as Record<string, number>)).sort(),
    engineFactors
  );
  assert.deepEqual(Object.keys(COMBO_SCORING_WEIGHTS).sort(), engineFactors);
});

test("schema and console defaults match the engine distribution", () => {
  const schemaDefaults = parseWeights({});
  for (const [factor, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    assert.equal(schemaDefaults[factor], weight, `schema default drifted for ${factor}`);
    assert.equal(
      (COMBO_SCORING_WEIGHTS as Record<string, number>)[factor],
      weight,
      `console default drifted for ${factor}`
    );
  }
});

test("connectionDensity and quality survive validation and normalization", () => {
  const saved = parseWeights({ connectionDensity: 0.2, quality: 0.1 });
  assert.equal(saved.connectionDensity, 0.2);
  assert.equal(saved.quality, 0.1);
  const normalized = normalizeScoringWeights(saved);
  assert.ok(normalized.connectionDensity > 0);
  assert.ok((normalized.quality ?? 0) > 0);
});

test("unknown factors remain rejected from the persisted shape", () => {
  const saved = parseWeights({ notAFactor: 0.5 });
  assert.equal("notAFactor" in saved, false);
});
