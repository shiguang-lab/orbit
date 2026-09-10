import assert from "node:assert/strict";
import test from "node:test";

import { normalizeClaudeToolsForDispatch } from "../src/handlers/chatCore/claudeToolDefaults.ts";

test("agentrouter strips only the Claude custom discriminator", () => {
  const tools = [
    { type: "custom", name: "weather", description: "Weather", input_schema: {} },
    { type: "web_search_20260209", name: "web_search" },
    { name: "typeless", input_schema: {} },
  ];
  const result = normalizeClaudeToolsForDispatch(tools, "agentrouter") as Array<
    Record<string, unknown>
  >;
  assert.equal(result[0].type, undefined);
  assert.equal(result[0].name, "weather");
  assert.equal(result[0].description, "Weather");
  assert.equal(result[1].type, "web_search_20260209");
  assert.equal(result[2].type, undefined);
  assert.equal(tools[0].type, "custom");
});

test("other Claude providers retain the strict-gateway default", () => {
  for (const provider of ["minimax", "claude", "some-gateway"]) {
    const result = normalizeClaudeToolsForDispatch(
      [{ name: "weather", input_schema: {} }],
      provider
    ) as Array<Record<string, unknown>>;
    assert.equal(result[0].type, "custom");
  }
  const explicit = normalizeClaudeToolsForDispatch(
    [{ type: "custom", name: "weather" }],
    "minimax"
  ) as Array<Record<string, unknown>>;
  assert.equal(explicit[0].type, "custom");
});

test("non-arrays and primitive entries pass through unchanged", () => {
  const object = { not: "tools" };
  assert.equal(normalizeClaudeToolsForDispatch(object, "agentrouter"), object);
  assert.deepEqual(
    normalizeClaudeToolsForDispatch(
      [{ type: "custom", name: "tool" }, null, "weird", 42],
      "agentrouter"
    ),
    [{ name: "tool" }, null, "weird", 42]
  );
});
