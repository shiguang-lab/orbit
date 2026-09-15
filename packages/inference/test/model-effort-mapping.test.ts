import assert from "node:assert/strict";
import test from "node:test";
import { getModelInfo } from "../src/services/runtimeModel.ts";

test("antigravity base models accurately map effort levels to real upstream model IDs", async () => {
  const info = await getModelInfo("antigravity/gemini-3.1-pro");
  assert.equal(info.provider, "antigravity");
  assert.ok(info.effortModelIds, "effortModelIds must be populated for gemini-3.1-pro");
  assert.equal(info.effortModelIds.low, "gemini-3.1-pro-low");
  assert.equal(info.effortModelIds.high, "gemini-pro-agent");
});

test("codex models accurately inherit normalized effortModelIds for upstream routing", async () => {
  const info = await getModelInfo("codex/gpt-5.6-sol");
  assert.equal(info.provider, "codex");
  assert.ok(info.effortModelIds, "effortModelIds must be populated for gpt-5.6-sol via normalized registry");
  assert.equal(info.effortModelIds.high, "gpt-5.6-sol-high");
  assert.equal(info.effortModelIds.low, "gpt-5.6-sol-low");
});

test("agy base models retain accurate effortModelIds", async () => {
  const info = await getModelInfo("agy/gemini-3.1-pro");
  assert.ok(info.provider === "agy" || info.provider === "antigravity");
  assert.ok(info.effortModelIds, "effortModelIds must be populated for agy gemini-3.1-pro");
  assert.equal(info.effortModelIds.low, "gemini-3.1-pro-low");
  assert.equal(info.effortModelIds.high, "gemini-pro-agent");
});
