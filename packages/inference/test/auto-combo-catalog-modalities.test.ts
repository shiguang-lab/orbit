import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { intersectStringArrays } from "@orbit/core/catalog/combo-capabilities";

/**
 * #11947 — the built-in `auto/*` entries advertised by /v1/models must derive
 * their modalities and vision support from the EFFECTIVE TARGET POOL rather
 * than hardcoding a baseline capabilities map. Otherwise OpenAI-compatible
 * clients (OpenCode, Hermes, ...) cannot detect vision support for `auto/*`
 * combos, even though the dashboard already shows the vision tag.
 *
 * The derivation runs inline inside the catalog build (it closes over the
 * per-build `getComboTargetCatalogMetadata`), so this file pairs a behavioural
 * check of the LCD-intersection primitive with a source guard on the wiring.
 */

const CATALOG_SOURCE = fs.readFileSync(
  path.join(import.meta.dirname, "../src/catalog/catalog.ts"),
  "utf8"
);

/** The block that materializes one built-in auto combo entry. */
function autoComboEntryBlock(): string {
  const match = CATALOG_SOURCE.match(
    /const virtualCombo = await createBuiltinAutoCombo\(autoId, suffix, preparedAutoInputs\);[\s\S]*?\n        \}\);/
  );
  assert.ok(match, "catalog must materialize the built-in auto combo entry");
  return match[0];
}

test("the LCD intersection is the modality aggregation primitive", () => {
  // Only modalities present in EVERY member survive — an auto pool that mixes a
  // text-only sibling with a vision sibling must not advertise image input.
  assert.deepEqual(intersectStringArrays([["text", "image"], ["text"]]), ["text"]);
  assert.deepEqual(
    intersectStringArrays([["text", "image"], ["text", "image"]]),
    ["text", "image"]
  );
  assert.deepEqual(intersectStringArrays([["text"], []]), []);
  assert.deepEqual(intersectStringArrays([]), []);
});

test("the auto combo entry reads modalities/vision from the target pool", () => {
  const block = autoComboEntryBlock();

  // The pool is mapped into the same ComboCatalogTarget shape the plain-combo
  // path uses, then resolved through getComboTargetCatalogMetadata.
  assert.match(
    block,
    /const autoTargets: ComboCatalogTarget\[\] = virtualCombo\.models\.map\(\(m\) => \(\{/,
    "the pool must be mapped into ComboCatalogTarget entries"
  );
  assert.match(
    block,
    /modelStr: m\.model,\s*providerId: m\.providerId,\s*connectionId: m\.connectionId,/,
    "each target must carry model/provider/connection identity"
  );
  assert.match(
    block,
    /const knownAutoMeta = autoTargetMetadata\.filter\(\s*\(m\): m is ComboTargetCatalogMetadata => m !== null\s*\);/,
    "unknown targets must be excluded from the aggregation"
  );

  // Modalities are advertised only when EVERY known target declares them.
  assert.match(
    block,
    /knownAutoMeta\.every\(\s*\(m\) => Array\.isArray\(m\.inputModalities\) && m\.inputModalities\.length > 0\s*\)\s*\?\s*intersectStringArrays\(/,
    "input_modalities must require unanimity across the known pool"
  );
  assert.match(
    block,
    /knownAutoMeta\.every\(\s*\(m\) => Array\.isArray\(m\.outputModalities\) && m\.outputModalities\.length > 0\s*\)\s*\?\s*intersectStringArrays\(/,
    "output_modalities must require unanimity across the known pool"
  );

  // Vision is advertised only when EVERY known target supports it.
  assert.match(
    block,
    /const allVision = knownAutoMeta\.every\(\(m\) => m\.capabilities\.vision === true\);/,
    "vision must require unanimity across the known pool"
  );
  assert.match(block, /if \(allVision\) autoCapabilities\.vision = true;/);
});

test("the auto combo entry keeps the baseline capabilities and baseline gating", () => {
  const block = autoComboEntryBlock();

  // #4189 baseline must not regress: tool_calling/reasoning/thinking/temperature
  // stay true, and modalities are only attached when non-empty (never `[]`).
  for (const key of ["tool_calling", "reasoning", "thinking", "temperature"]) {
    assert.match(
      block,
      new RegExp(`${key}: true,`),
      `${key} baseline capability must be preserved`
    );
  }
  assert.match(
    block,
    /\.\.\.\(autoInputModalities\.length > 0\s*\?\s*\{ input_modalities: autoInputModalities \}\s*:\s*\{\}\)/,
    "input_modalities must be omitted when the pool declares none"
  );
  assert.match(
    block,
    /\.\.\.\(autoOutputModalities\.length > 0\s*\?\s*\{ output_modalities: autoOutputModalities \}\s*:\s*\{\}\)/,
    "output_modalities must be omitted when the pool declares none"
  );
  assert.match(block, /capabilities: autoCapabilities,/);
});
