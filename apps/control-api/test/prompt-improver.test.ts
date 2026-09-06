import assert from "node:assert/strict";
import test from "node:test";

import {
  ImprovePromptRequestSchema,
  buildImproveChatBody,
  parseImprovedContent,
} from "../src/playground/runtime/prompt-improver.js";

test("prompt improver requires content and builds the selected model request", () => {
  assert.equal(ImprovePromptRequestSchema.safeParse({ model: "test" }).success, false);

  const request = ImprovePromptRequestSchema.parse({
    system: "  Be accurate. ",
    prompt: "Explain routing.",
    model: "codex/model",
    tone: "detailed",
  });
  const body = buildImproveChatBody(request);
  assert.equal(body.model, "codex/model");
  assert.equal(body.stream, false);
  assert.match(body.messages[1].content, /^Be detailed and explicit/);
  assert.match(body.messages[1].content, /<<SYSTEM>>\n  Be accurate\./);
  assert.match(body.messages[1].content, /<<PROMPT>>\nExplain routing\./);
});

test("prompt improver parses single and paired responses", () => {
  assert.deepEqual(parseImprovedContent(" Better prompt ", false, true), {
    improvedPrompt: "Better prompt",
  });
  assert.deepEqual(
    parseImprovedContent("<<SYSTEM>>\nBetter system\n<<PROMPT>>\nBetter prompt", true, true),
    { improvedSystem: "Better system", improvedPrompt: "Better prompt" },
  );
});
