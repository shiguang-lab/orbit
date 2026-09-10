import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { resolveComboContextLimit } from "../src/services/contextManager.ts";

/**
 * Regression guard for #12090: an operator-set `context_length` on a combo record
 * must be honored by request-time context resolution, not just by the /v1/models
 * catalog advertisement. Before the fix `resolveComboContextLimit()` had no notion
 * of the combo's own `context_length`, so a combo whose members carry no per-model
 * window fell through to the provider's generic default (128000) and rejected large
 * requests the operator had explicitly sized for.
 */

/** A provider that is in no registry and has no models.dev row → generic fallback. */
const UNKNOWN_PROVIDER = "definitely-not-a-registered-provider";

test("an explicit combo context_length is honored when the target window is unknown", () => {
  const resolved = resolveComboContextLimit({
    provider: UNKNOWN_PROVIDER,
    model: "zdr-glm-5.3-flash-max",
    comboTargetLimits: [],
    comboContextLength: 960_000,
  });

  assert.equal(resolved.limit, 960_000);
  assert.equal(resolved.source, "combo-explicit");
});

test("an explicit combo context_length outranks a specific target window", () => {
  // The operator's declaration is authoritative — it wins even when the concrete
  // target resolves a specific (name-hinted / registry-known) window.
  const resolved = resolveComboContextLimit({
    provider: UNKNOWN_PROVIDER,
    model: "claude-sonnet-4",
    comboTargetLimits: [200_000],
    comboContextLength: 512_000,
  });

  assert.equal(resolved.limit, 512_000);
  assert.equal(resolved.source, "combo-explicit");
});

test("a specific target window still wins when the combo sets no context_length", () => {
  const resolved = resolveComboContextLimit({
    provider: UNKNOWN_PROVIDER,
    model: "claude-sonnet-4",
    comboTargetLimits: [777_000],
  });

  assert.equal(resolved.limit, 200_000);
  assert.equal(resolved.source, "target");
});

test("the combo-min fallback is unchanged when no explicit value is set", () => {
  const resolved = resolveComboContextLimit({
    provider: UNKNOWN_PROVIDER,
    model: "unknown-model",
    comboTargetLimits: [640_000, 900_000],
    comboContextLength: null,
  });

  assert.equal(resolved.limit, 640_000);
  assert.equal(resolved.source, "combo-min");
});

for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
  test(`an invalid combo context_length (${String(value)}) is ignored, not trusted`, () => {
    const resolved = resolveComboContextLimit({
      provider: UNKNOWN_PROVIDER,
      model: "unknown-model",
      comboTargetLimits: [640_000],
      comboContextLength: value as number | null,
    });

    assert.notEqual(resolved.source, "combo-explicit");
    assert.equal(resolved.limit, 640_000);
  });
}

test("chatCore feeds the persisted combo context_length into the resolver", () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, "../src/handlers/chatCore.ts"),
    "utf8"
  );

  assert.match(
    source,
    /const rawComboContextLength = \(comboConfig as \{ context_length\?: unknown \} \| null\)\s*\n\s*\?\.context_length;/,
    "chatCore must read the combo record's context_length"
  );
  assert.match(
    source,
    /resolveComboContextLimit\(\{\s*provider,\s*model: effectiveModel,\s*comboTargetLimits,\s*comboContextLength,\s*\}\);/,
    "chatCore must forward comboContextLength to the combo context resolver"
  );
});
