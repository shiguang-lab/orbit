import assert from "node:assert/strict";
import test from "node:test";

import { openaiResponsesToOpenAIRequest } from "../src/translator/request/openai-responses.ts";

function translate(body: Record<string, unknown>): Record<string, unknown> {
  return openaiResponsesToOpenAIRequest(null, body, null, null) as Record<string, unknown>;
}

test("Responses-to-Chat strips neutral tool_choice when tools are absent", () => {
  assert.equal(
    translate({ model: "vllm/qwen", input: "hello", tools: [], tool_choice: "auto" })
      .tool_choice,
    undefined
  );
  assert.equal(
    translate({ model: "vllm/qwen", input: "hello", tool_choice: "none" }).tool_choice,
    undefined
  );
});

test("Responses-to-Chat preserves neutral tool_choice when a tool is present", () => {
  const result = translate({
    model: "vllm/qwen",
    input: "hello",
    tools: [{ type: "function", name: "weather", parameters: {} }],
    tool_choice: "auto",
  });
  assert.equal(result.tool_choice, "auto");
  assert.equal((result.tools as unknown[]).length, 1);
});

test("Responses-to-Chat preserves contradictory required choice without tools", () => {
  assert.equal(
    translate({ model: "vllm/qwen", input: "hello", tools: [], tool_choice: "required" })
      .tool_choice,
    "required"
  );
});
