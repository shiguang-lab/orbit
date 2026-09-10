import assert from "node:assert/strict";
import test from "node:test";

import {
  applyReasoningInputPolicy,
  resolveReasoningTransport,
} from "../src/services/reasoningInputPolicy.ts";
import { FORMATS } from "../src/translator/formats.ts";
import { translateRequest } from "../src/translator/index.ts";
import { installRuntimePorts } from "../src/services/dbRuntimeHooks.ts";

installRuntimePorts();

test("generic Responses and Codex provider variants use opaque reasoning transport", () => {
  assert.equal(resolveReasoningTransport("openai-compatible-responses-codex"), "opaque");
  assert.equal(resolveReasoningTransport("custom-openai-responses"), "opaque");
  assert.equal(resolveReasoningTransport("codex-proxy"), "opaque");
  assert.equal(resolveReasoningTransport("ordinary-chat-proxy"), "plaintext");
});

test("Chat-to-Responses translation strips plaintext reasoning for opaque backends", () => {
  const translated = translateRequest(
    FORMATS.OPENAI,
    FORMATS.OPENAI_RESPONSES,
    "gpt-5.6-codex",
    {
      model: "gpt-5.6-codex",
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "Hi", reasoning_content: "private reasoning" },
        { role: "user", content: "continue" },
      ],
    },
    false,
    null,
    "openai-compatible-responses-codex"
  ) as Record<string, unknown>;

  const reasoningItems = (translated.input as Array<Record<string, unknown>>).filter(
    (item) => item.type === "reasoning"
  );
  assert.equal(
    reasoningItems.some(
      (item) => Array.isArray(item.content) && (item.content as unknown[]).length > 0
    ),
    false
  );
});

test("direct Responses policy removes plaintext reasoning content", () => {
  const body: Record<string, unknown> = {
    input: [
      {
        type: "reasoning",
        content: [{ type: "reasoning_text", text: "private reasoning" }],
        summary: [],
      },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "Done" }] },
    ],
  };
  applyReasoningInputPolicy(body, "responses", {
    provider: "openai-compatible-responses-vllm",
    onIncompatibleReasoning: "drop",
  });
  const reasoningItems = (body.input as Array<Record<string, unknown>>).filter(
    (item) => item.type === "reasoning"
  );
  assert.equal(reasoningItems.some((item) => item.content !== undefined), false);
});
