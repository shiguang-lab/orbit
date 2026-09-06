import assert from "node:assert/strict";
import test from "node:test";
import {
  compressionPreviewConfigSchema,
  compressionSettingsUpdateSchema,
  contextEditingConfigSchema,
  rtkConfigSchema,
  STACKED_PIPELINE_ENGINE_INTENSITIES,
  stackedPipelineStepSchema,
} from "../src/compression/compression-config-schemas.js";

test("keeps optional defaults, strictness, non-coercion, and numeric boundaries", () => {
  assert.deepEqual(compressionSettingsUpdateSchema.parse({}), {});
  assert.strictEqual(compressionPreviewConfigSchema, compressionSettingsUpdateSchema);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ unknown: true }).success, false);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ autoTriggerTokens: "10" }).success, false);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ cacheMinutes: 1 }).success, true);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ cacheMinutes: 60 }).success, true);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ cacheMinutes: 0 }).success, false);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ contextBudget: { pct: 1 } }).success, true);
  assert.equal(compressionSettingsUpdateSchema.safeParse({ contextBudget: { pct: 1.01 } }).success, false);
  assert.equal(rtkConfigSchema.safeParse({ rawOutputMaxBytes: 1024 }).success, true);
  assert.equal(rtkConfigSchema.safeParse({ rawOutputMaxBytes: 1023 }).success, false);
});

test("preserves strip behavior for context editing and strict stacked steps", () => {
  assert.deepEqual(contextEditingConfigSchema.parse({ enabled: true, ignored: "value" }), { enabled: true });
  assert.deepEqual(stackedPipelineStepSchema.parse({
    engine: "headroom",
    intensity: "custom",
    config: { futureSetting: 1 },
  }), {
    engine: "headroom",
    intensity: "custom",
    config: { futureSetting: 1 },
  });
  assert.equal(stackedPipelineStepSchema.safeParse({ engine: "unknown" }).success, false);
  assert.equal(stackedPipelineStepSchema.safeParse({ engine: "lite", extra: true }).success, false);
});

test("keeps every advertised engine intensity accepted by its discriminated schema", () => {
  for (const [engine, intensities] of Object.entries(STACKED_PIPELINE_ENGINE_INTENSITIES)) {
    if (intensities.length === 0) {
      assert.equal(stackedPipelineStepSchema.safeParse({ engine }).success, true, engine);
      continue;
    }
    for (const intensity of intensities) {
      assert.equal(stackedPipelineStepSchema.safeParse({ engine, intensity }).success, true, `${engine}:${intensity}`);
    }
  }
});
