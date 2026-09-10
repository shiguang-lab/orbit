import assert from "node:assert/strict";
import test from "node:test";
import { stripObfuscationZeroWidth } from "../src/utils/zeroWidth.ts";
import { sanitizeOpenAIResponse, sanitizeStreamingChunk } from "../src/handlers/responseSanitizer.ts";

const PERSIAN = "ارائه\u200Cدهنده";
const FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";

test("zero-width cleanup preserves linguistic and emoji joiners", () => {
  assert.equal(stripObfuscationZeroWidth(PERSIAN), PERSIAN);
  assert.equal(stripObfuscationZeroWidth(FAMILY), FAMILY);
  assert.equal(stripObfuscationZeroWidth("o\u200Dpencode c\u200Dursor"), "opencode cursor");
  assert.equal(stripObfuscationZeroWidth(`\u200B${PERSIAN}\uFEFF`), PERSIAN);
});

test("non-streaming and streaming response sanitizers preserve joiners", () => {
  const response = sanitizeOpenAIResponse({
    id: "chatcmpl-zero-width",
    model: "test",
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: `${PERSIAN} ${FAMILY}` } }],
  }) as { choices: Array<{ message: { content: string } }> };
  assert.equal(response.choices[0].message.content, `${PERSIAN} ${FAMILY}`);

  const chunk = sanitizeStreamingChunk({
    id: "chatcmpl-zero-width",
    object: "chat.completion.chunk",
    choices: [{ index: 0, finish_reason: null, delta: { content: PERSIAN } }],
  }) as { choices: Array<{ delta: { content: string } }> };
  assert.equal(chunk.choices[0].delta.content, PERSIAN);
});
