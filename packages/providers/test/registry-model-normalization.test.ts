import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRegistryModelRows } from "../src/config/registryModelNormalization.ts";
import { resolveAntigravityModelId } from "../src/config/antigravityModelAliases.ts";

test("normalizes static effort, thinking, and tiered rows into one base model", () => {
  const models = normalizeRegistryModelRows([
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "gemini-3.7-flash-tiered", name: "Gemini 3.7 Flash (tiered)", supportsReasoning: true },
    { id: "gpt-5.6-sol", name: "GPT 5.6 Sol" },
    { id: "gpt-5.6-sol-high", name: "GPT 5.6 Sol (High)", effortVariant: { baseModel: "gpt-5.6-sol", effort: "high" } },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 Thinking", supportsReasoning: true },
  ]);

  assert.deepEqual(models.map((model) => model.id), [
    "gemini-3.7-flash",
    "gpt-5.6-sol",
    "claude-opus-4-6",
  ]);
  assert.equal(models[0]?.tieredModelId, "gemini-3.7-flash-tiered");
  assert.equal(models[1]?.effortModelIds?.high, "gpt-5.6-sol-high");
  assert.equal(models[2]?.thinkingModelId, "claude-opus-4-6-thinking");
});

test("resolves Antigravity model IDs and effort variants to upstream endpoints", () => {
  assert.equal(resolveAntigravityModelId("gemini-3.8-flash"), "gemini-3.8-flash-tiered");
  assert.equal(resolveAntigravityModelId("gemini-3.8-flash-high"), "gemini-3.8-flash-tiered");
  assert.equal(resolveAntigravityModelId("gemini-3.7-flash"), "gemini-3.7-flash-tiered");
  assert.equal(resolveAntigravityModelId("gemini-3.6-flash"), "gemini-3.6-flash-tiered");
  assert.equal(resolveAntigravityModelId("gemini-3.1-pro"), "gemini-pro-agent");
  assert.equal(resolveAntigravityModelId("claude-opus-4-6"), "claude-opus-4-6-thinking");
});

