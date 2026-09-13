import assert from "node:assert/strict";
import test from "node:test";

import { collapseDiscoveredEffortVariants } from "../src/lib/providerModels/modelDiscovery.ts";

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
    },
    {
      id: "vendor-reasoner",
      name: "Vendor Reasoner",
      source: "imported",
      supportsThinking: true,
      supportedThinkingEfforts: ["low", "high"],
    },
  ]);
});

