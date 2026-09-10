import assert from "node:assert/strict";
import test from "node:test";

import { ALL_COMBOS_ACCESS_RULE } from "../src/shared/constants/comboAccess.ts";
import { parseAllowedCombos } from "../src/lib/db/apiKeys/rowParsers.ts";

/**
 * Regression guard for #12070: a legacy api_keys row whose `allowed_combos`
 * column is NULL must hydrate as allow-all, not deny-all.
 *
 * Migration 149 back-fills NULL/empty/malformed rows to `["combo/*"]`, but it
 * only runs once at upgrade time. A key written afterwards by an older client
 * that does not know the column leaves it NULL, so the runtime parser has to
 * reproduce the pre-149 semantics (NULL meant allow-all) while still honoring an
 * explicit `[]` as deny-all.
 */
test("parseAllowedCombos preserves legacy NULL as allow-all", () => {
  assert.deepEqual(parseAllowedCombos(null), [ALL_COMBOS_ACCESS_RULE]);
  assert.deepEqual(parseAllowedCombos(undefined), [ALL_COMBOS_ACCESS_RULE]);
});

test("parseAllowedCombos keeps an explicit empty array as deny-all", () => {
  assert.deepEqual(parseAllowedCombos("[]"), []);
});

test("parseAllowedCombos parses explicit rules and tolerates junk", () => {
  assert.deepEqual(parseAllowedCombos('["fast-chat"]'), ["fast-chat"]);
  assert.deepEqual(parseAllowedCombos('[1, "fast", null]'), ["fast"]);
  assert.deepEqual(parseAllowedCombos("not json"), []);
  assert.deepEqual(parseAllowedCombos(""), []);
});
