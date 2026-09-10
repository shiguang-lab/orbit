import assert from "node:assert/strict";
import test from "node:test";

import { openaiToOpenAIResponsesRequest } from "../src/translator/request/openai-responses.ts";

function translate(content: unknown): Record<string, unknown> {
  return openaiToOpenAIResponsesRequest(
    "gpt-4o",
    {
      messages: [
        { role: "system", content },
        { role: "user", content: "hi" },
      ],
    },
    null,
    null
  ) as Record<string, unknown>;
}

test("system text content parts become Responses instructions", () => {
  assert.equal(translate([{ type: "text", text: "Be terse." }]).instructions, "Be terse.");
});

test("cache_control metadata does not discard system part text", () => {
  assert.equal(
    translate([
      { type: "text", text: "Constitution.", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Charter.", cache_control: { type: "ephemeral" } },
    ]).instructions,
    "Constitution.\n\nCharter."
  );
});

test("string and empty system content preserve their existing output", () => {
  assert.equal(translate("Be terse.").instructions, "Be terse.");
  assert.equal(translate([]).instructions, "");
});
