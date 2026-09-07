import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTr,
  matchesAnyToken,
  matchesSearch,
  normalizeForSearch,
} from "../src/common/turkish-text.js";

test("normalizes Turkish casing and accents without changing whitespace semantics", () => {
  assert.equal(normalizeForSearch("  İSTANBUL  "), "istanbul");
  assert.equal(normalizeForSearch("Iğdır Şarj ÇÖZÜMÜ"), "igdir sarj cozumu");
  assert.equal(normalizeForSearch(null), "");
});

test("keeps full-query and token fallback search behavior", () => {
  assert.equal(matchesSearch("İstanbul sağlayıcı", "istanbul"), true);
  assert.equal(matchesSearch("Ankara", ""), true);
  assert.equal(matchesSearch("Ankara", "İzmir"), false);
  assert.equal(matchesAnyToken("Claude sağlayıcı", "model saglayici"), true);
  assert.equal(matchesAnyToken("Claude sağlayıcı", "model provider"), false);
});

test("sorts with Turkish locale and numeric collation", () => {
  assert.ok(compareTr("model-2", "model-10") < 0);
  assert.equal(compareTr("Şehir", "şehir"), 0);
  assert.ok(compareTr(undefined, "a") < 0);
});
