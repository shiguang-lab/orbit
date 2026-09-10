import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFollowUpSourceBody,
  serializeBoundedToolResult,
} from "../src/lib/skills/followUpTranscript.ts";

const calls = [{ id: "call_1", name: "memory_search", arguments: { query: "q" } }];
const results = [{ id: "call_1", name: "memory_search", result: { answer: "found" } }];

test("builds OpenAI assistant/tool adjacency for a follow-up leg", () => {
  const body = buildFollowUpSourceBody({
    sourceBody: { messages: [{ role: "user", content: "remember?" }], stream: true },
    previousResponse: {
      choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "call_1" }] } }],
    },
    toolCalls: calls,
    results,
    sourceFormat: "openai",
  });
  const messages = body.messages as Record<string, unknown>[];
  assert.equal(messages.at(-2)?.role, "assistant");
  assert.equal(messages.at(-1)?.role, "tool");
  assert.equal(messages.at(-1)?.tool_call_id, "call_1");
  assert.equal(body.stream, false);
});

test("builds Claude assistant tool_use followed by user tool_result", () => {
  const toolUse = { type: "tool_use", id: "call_1", name: "memory_search", input: { query: "q" } };
  const body = buildFollowUpSourceBody({
    sourceBody: { messages: [{ role: "user", content: "remember?" }] },
    previousResponse: { content: [toolUse], stop_reason: "tool_use" },
    toolCalls: calls,
    results,
    sourceFormat: "claude",
  });
  const messages = body.messages as Record<string, unknown>[];
  assert.deepEqual(messages.at(-2), { role: "assistant", content: [toolUse] });
  assert.equal(messages.at(-1)?.role, "user");
  assert.equal((messages.at(-1)?.content as Record<string, unknown>[])[0].type, "tool_result");
});

test("bounds tool output by UTF-8 bytes without splitting emoji", () => {
  const bounded = serializeBoundedToolResult({ text: "🌍".repeat(100) }, 80);
  assert.equal(Buffer.byteLength(bounded.text, "utf8") <= 80, true);
  assert.equal(bounded.truncated, true);
  assert.ok(!bounded.text.includes("�"));
});

test("fails closed on mismatched tool result identity", () => {
  assert.throws(() =>
    buildFollowUpSourceBody({
      sourceBody: { messages: [] },
      previousResponse: {},
      toolCalls: calls,
      results: [{ id: "call_1", name: "memory_delete", result: null }],
      sourceFormat: "openai",
    })
  );
});
