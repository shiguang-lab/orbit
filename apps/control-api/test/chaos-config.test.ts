import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CHAOS_CONFIG,
  chaosConfigSchema,
} from "../src/chaos/runtime/config.js";

test("Chaos config applies bounded defaults", () => {
  assert.deepEqual(chaosConfigSchema.parse({}), DEFAULT_CHAOS_CONFIG);
  assert.deepEqual(
    chaosConfigSchema.parse({
      enabled: true,
      providerOverrides: [{ providerId: "codex" }],
    }),
    {
      ...DEFAULT_CHAOS_CONFIG,
      enabled: true,
      providerOverrides: [{ providerId: "codex", enabled: true }],
    },
  );
});

test("Chaos config rejects unsafe execution limits", () => {
  assert.equal(chaosConfigSchema.safeParse({ timeoutMs: 1 }).success, false);
  assert.equal(chaosConfigSchema.safeParse({ maxTokens: 200_000 }).success, false);
  assert.equal(chaosConfigSchema.safeParse({ providerOverrides: [{ providerId: "" }] }).success, false);
});
