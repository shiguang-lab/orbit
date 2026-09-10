/**
 * Port of upstream tests/unit/openai-to-claude-undefined-signature-12105.test.ts
 * (#180 sync). A cross-provider `reasoning_content` becomes an unsigned
 * `thinking` block; replaying it to Anthropic must drop the block rather than
 * stamp it with the fabricated DEFAULT_THINKING_CLAUDE_SIGNATURE, which
 * Anthropic rejects with "Invalid signature" (HTTP 400).
 */
import test from "node:test";
import assert from "node:assert/strict";

import { openaiToClaudeRequest } from "../src/translator/request/openai-to-claude.ts";

test("#12105: thinking block with NO signature field is dropped, not stamped with the default signature", () => {
  const result = openaiToClaudeRequest(
    "claude-opus-4-8",
    {
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "I already have this" },
            { type: "text", text: "Answer" },
          ],
        },
        { role: "user", content: "go on" },
      ],
    },
    false
  );

  const assistant = result.messages.find(
    (m: { role: string }) => m.role === "assistant"
  ) as unknown as { content: Array<{ type: string; text?: string; signature?: string }> };
  assert.ok(assistant, "assistant message must survive translation");
  const thinkingBlocks = assistant.content.filter((b) => b && b.type === "thinking");
  assert.equal(
    thinkingBlocks.length,
    0,
    "unsigned thinking block must be stripped, not fabricated"
  );
  const textBlocks = assistant.content.filter((b) => b && b.type === "text");
  assert.equal(textBlocks.length, 1, "text block must be preserved");
  assert.equal(textBlocks[0].text, "Answer");
});

test("#12105: thinking block with an explicit real signature is preserved verbatim", () => {
  const realSig = "euAgBSECEAAQCRjsMtMiNno1sO1GvuiYtDQTKLHDv3Ih";
  const result = openaiToClaudeRequest(
    "claude-opus-4-8",
    {
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "Legit reasoning", signature: realSig },
            { type: "text", text: "Answer" },
          ],
        },
        { role: "user", content: "go on" },
      ],
    },
    false
  );

  const assistant = result.messages.find(
    (m: { role: string }) => m.role === "assistant"
  ) as unknown as { content: Array<{ type: string; signature?: string }> };
  const thinkingBlocks = assistant.content.filter((b) => b && b.type === "thinking");
  assert.equal(thinkingBlocks.length, 1, "signed thinking block must survive");
  assert.equal(thinkingBlocks[0].signature, realSig, "valid signature preserved verbatim");
});

test("#12105: redacted_thinking with empty data is still stripped", () => {
  const result = openaiToClaudeRequest(
    "claude-opus-4-8",
    {
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [
            { type: "redacted_thinking", data: "" },
            { type: "text", text: "Answer" },
          ],
        },
        { role: "user", content: "go on" },
      ],
    },
    false
  );

  const assistant = result.messages.find(
    (m: { role: string }) => m.role === "assistant"
  ) as unknown as { content: Array<{ type: string }> };
  const redacted = assistant.content.filter((b) => b && b.type === "redacted_thinking");
  assert.equal(redacted.length, 0, "empty redacted_thinking must be dropped");
});
