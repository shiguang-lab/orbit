import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isCompressionExcluded,
  normalizeCompressionExclusions,
} from "../src/services/compression/exclusions.js";

const source = readFileSync(new URL("../src/handlers/chatCore.ts", import.meta.url), "utf8");

test("native Codex passthrough does not disable prompt compression", () => {
  const assignment = source.match(/const compressionExcluded =([\s\S]*?);/);
  assert.ok(assignment);
  assert.doesNotMatch(assignment[1], /nativeCodexPassthrough/);
  assert.match(assignment[1], /isCompressionExcluded/);
});

test("Codex compression is enabled by default and operator-excludable", () => {
  assert.equal(
    isCompressionExcluded(
      { provider: "codex", model: "gpt-5.6-terra" },
      normalizeCompressionExclusions([])
    ),
    false
  );
  assert.equal(
    isCompressionExcluded(
      { provider: "codex", model: "gpt-5.6-terra" },
      normalizeCompressionExclusions(["codex/*"])
    ),
    true
  );
});

test("reactive compaction still excludes native Codex passthrough", () => {
  assert.match(
    source,
    /reactiveContextCompactionEnabled\s*&&\s*!nativeCodexPassthrough\s*&&\s*estimatedTokens\s*>\s*threshold/
  );
  assert.match(
    source,
    /reactiveContextCompactionEnabled\s*&&\s*!nativeCodexPassthrough\s*&&\s*finalEstimatedInputTokens\s*>=\s*finalContextLimit/
  );
});
