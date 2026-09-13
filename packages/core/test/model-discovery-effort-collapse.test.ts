import assert from "node:assert/strict";
import test from "node:test";

import {
  collapseDiscoveredEffortVariants,
  normalizeDiscoveredModels,
} from "../src/lib/providerModels/modelDiscovery.ts";

test("collapses effort-suffixed discovery rows for every provider", () => {
  const result = collapseDiscoveredEffortVariants([
    { id: "gemini-3.8-flash-low", name: "Gemini 3.8 Flash (Low)", source: "imported" },
    { id: "gemini-3.8-flash-medium", name: "Gemini 3.8 Flash (Medium)", source: "imported" },
    { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash (High)", source: "imported" },
    { id: "vendor-reasoner-low", name: "Vendor Reasoner (Low)", source: "imported" },
    { id: "vendor-reasoner-high", name: "Vendor Reasoner (High)", source: "imported" },
  ]);

  assert.deepEqual(result, [
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      source: "imported",
      supportsThinking: true,
      supportedThinkingEfforts: ["low", "medium", "high"],
      effortModelIds: {
        low: "gemini-3.8-flash-low",
        medium: "gemini-3.8-flash-medium",
        high: "gemini-3.8-flash-high",
      },
    },
    {
      id: "vendor-reasoner",
      name: "Vendor Reasoner",
      source: "imported",
      supportsThinking: true,
      supportedThinkingEfforts: ["low", "high"],
      effortModelIds: {
        low: "vendor-reasoner-low",
        high: "vendor-reasoner-high",
      },
    },
  ]);
});

test("collapses thinking model ids into a base row and retains the upstream id", () => {
  const result = normalizeDiscoveredModels([
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 (Thinking)" },
    { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash Thinking" },
  ]);

  assert.deepEqual(result, [
    {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      source: "imported",
      supportsThinking: true,
      thinkingModelId: "claude-opus-4-6-thinking",
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      source: "imported",
      supportsThinking: true,
      thinkingModelId: "gemini-2.5-flash-thinking",
    },
  ]);
});

test("derives thinking support from standard /models reasoning metadata", () => {
  assert.deepEqual(
    normalizeDiscoveredModels([
      {
        id: "standard-reasoner",
        name: "Standard Reasoner",
        reasoning: { supported_efforts: ["low", "high"] },
      },
    ]),
    [
      {
        id: "standard-reasoner",
        name: "Standard Reasoner",
        source: "imported",
        supportsThinking: true,
        supportedThinkingEfforts: ["low", "high"],
      },
    ]
  );
});
