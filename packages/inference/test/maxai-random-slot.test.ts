import assert from "node:assert/strict";
import test from "node:test";
import { maxaiRandomSlot } from "../src/executors/maxai/signing.ts";

test("MaxAI X-Random uses a six-digit cryptographic random slot", () => {
  const samples = Array.from({ length: 2_000 }, () => maxaiRandomSlot());
  for (const sample of samples) {
    assert.match(sample, /^\d{6}$/);
    assert.ok(Number(sample) >= 100_000 && Number(sample) <= 999_999);
  }
  assert.ok(samples.some((sample) => Number(sample) < 550_000));
  assert.ok(samples.some((sample) => Number(sample) >= 550_000));
  assert.ok(new Set(samples).size > 1_900);
});
