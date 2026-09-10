import assert from "node:assert/strict";
import test from "node:test";
import { redactCredentials } from "../src/lib/guardrails/credentialMasker.js";

test("credential guardrail redacts variable-length Google API keys", () => {
  for (const suffix of ["a".repeat(20), "b".repeat(35), "c".repeat(80)]) {
    const result = redactCredentials(`rejected AIza${suffix}`);
    assert.equal(result.modified, true);
    assert.doesNotMatch(result.text, /AIza/);
  }
});
