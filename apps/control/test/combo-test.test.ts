import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  buildComboTestRequestBody,
  extractComboTestResponseText,
  extractComboTestStreamResult,
  extractComboTestStreamText,
} from "../src/combos/combo-test.js";

const originalRandom = Math.random;

afterEach(() => {
  Math.random = originalRandom;
});

test("builds deterministic chat, streaming, custom-prompt, and embedding requests", () => {
  const values = [0, 0.99999];
  Math.random = () => values.shift() ?? 0;
  assert.deepEqual(buildComboTestRequestBody("provider/chat"), {
    model: "provider/chat",
    messages: [{
      role: "user",
      content: "Calculate 10000+99999, and reply with the result only.",
    }],
    max_tokens: 2048,
    stream: false,
  });
  assert.deepEqual(buildComboTestRequestBody("provider/chat", false, {
    stream: true,
    prompt: "  deterministic prompt  ",
  }), {
    model: "provider/chat",
    messages: [{ role: "user", content: "deterministic prompt" }],
    max_tokens: 64,
    stream: true,
  });
  assert.equal(buildComboTestRequestBody("provider/chat", false, {
    stream: true,
    maxTokens: 12,
    prompt: "test",
  }).max_tokens, 12);
  assert.deepEqual(buildComboTestRequestBody("provider/embed", true), {
    model: "provider/embed",
    input: "Hello World",
  });
});

test("extracts text from chat, response, embedding, content-block, and reasoning shapes", () => {
  assert.equal(extractComboTestResponseText({ output_text: "  direct  " }), "direct");
  assert.equal(extractComboTestResponseText({ data: [{ embedding: [0.1] }] }), "[Embedding generated successfully]");
  assert.equal(extractComboTestResponseText({ choices: [{ message: { content: [
    { type: "text", text: " first " },
    { type: "output_text", text: "second" },
    { type: "image", text: "ignored" },
  ] } }] }), "first\nsecond");
  assert.equal(extractComboTestResponseText({ choices: [{ message: {
    content: "",
    reasoning_details: [{ type: "thinking", content: " reason " }],
  } }] }), "reason");
  assert.equal(extractComboTestResponseText({ choices: [{ text: " legacy " }] }), "legacy");
  assert.equal(extractComboTestResponseText({ output: [{ content: [{ type: "text", text: "response item" }] }] }), "response item");
  assert.equal(extractComboTestResponseText({ content: " top level " }), "top level");
});

test("recognizes reasoning-only completions but rejects empty or malformed bodies", () => {
  assert.equal(extractComboTestResponseText({
    choices: [{ finish_reason: "length", message: { role: "assistant", content: "" } }],
    usage: { completion_tokens_details: { reasoning_tokens: 8 } },
  }), "[reasoning-only completion]");
  assert.equal(extractComboTestResponseText({ choices: [] }), "");
  assert.equal(extractComboTestResponseText(null), "");
});

test("parses SSE deltas, ignores malformed events, and preserves structured errors", () => {
  const stream = [
    "data: not-json",
    'data: {"choices":[{"delta":{"content":"Hello "}}]}',
    'data: {"choices":[{"delta":{"reasoning_content":"world"}}]}',
    'data: {"error":{"message":"quota exhausted","status":"429"}}',
    "data: [DONE]",
    "",
  ].join("\n");
  assert.deepEqual(extractComboTestStreamResult(stream), {
    text: "Helloworld",
    error: { message: "quota exhausted", statusCode: 429 },
  });
  assert.equal(extractComboTestStreamText(stream), "Helloworld");
});
