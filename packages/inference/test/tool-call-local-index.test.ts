import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocalToolCallIndex } from "../src/translator/response/openai-responses/toolCallLocalIndex.js";

test("non-contiguous upstream tool indices become gap-free in first-seen order", () => {
  const state = {};
  assert.equal(resolveLocalToolCallIndex(state, 1), 0);
  assert.equal(resolveLocalToolCallIndex(state, 2), 1);
  assert.equal(resolveLocalToolCallIndex(state, 4), 2);
});

test("repeated and string indices retain stable local identity", () => {
  const state = {};
  assert.equal(resolveLocalToolCallIndex(state, 7), 0);
  assert.equal(resolveLocalToolCallIndex(state, 7), 0);
  assert.equal(resolveLocalToolCallIndex(state, "slot-x"), 1);
  assert.equal(resolveLocalToolCallIndex(state, "slot-x"), 1);
});
