import assert from "node:assert/strict";
import test from "node:test";

import {
  injectMemoryAndSkills,
  sortToolsByName,
} from "../src/handlers/chatCore/memorySkillsInjection.ts";

test("sortToolsByName handles Chat and Anthropic tool shapes deterministically", () => {
  const tools = [
    { function: { name: "z_tool" } },
    { name: "a_tool" },
    { function: { name: "m_tool" } },
  ];
  assert.deepEqual(sortToolsByName(tools), [tools[1], tools[2], tools[0]]);
  assert.deepEqual(tools, [
    { function: { name: "z_tool" } },
    { name: "a_tool" },
    { function: { name: "m_tool" } },
  ]);
});

test("memory/skills injection returns tools in stable name order", async () => {
  const tools = [
    { type: "function", function: { name: "weather", parameters: {} } },
    { name: "calculator", input_schema: {} },
  ];
  const result = await injectMemoryAndSkills({
    body: { messages: [], tools },
    memoryOwnerId: null,
    provider: "openai",
    effectiveModel: "gpt-test",
    sourceFormat: "openai",
    targetFormat: "openai",
    backgroundReason: null,
    log: null,
  });

  assert.deepEqual(
    (result.body.tools as Array<Record<string, unknown>>).map(
      (tool) => tool.name ?? (tool.function as Record<string, unknown>)?.name
    ),
    ["calculator", "weather"]
  );
});
