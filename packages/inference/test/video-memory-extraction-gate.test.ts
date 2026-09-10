import assert from "node:assert/strict";
import test from "node:test";
import {
  runMemoryExtractionGate,
  shouldExtractMemory,
} from "../src/handlers/chatCore/memoryExtraction.ts";
import { applyVideoBridgeLogRedaction } from "../src/handlers/chatCore/attemptLogging.ts";

test("video bridge observations disable durable memory extraction", () => {
  assert.equal(
    shouldExtractMemory({
      enabled: true,
      maxTokens: 2_000,
      memoryOwnerId: "api-key-1",
      videoBridgeObserved: true,
    }),
    false
  );

  const calls: Array<[string, string, string]> = [];
  runMemoryExtractionGate({
    memoryOwnerId: "api-key-1",
    memorySettings: { enabled: true, maxTokens: 2_000 },
    videoBridgeObserved: true,
    pipelineSessionId: "session-1",
    requestBody: { messages: [{ role: "user", content: "private transcript" }] },
    responseBody: { choices: [{ message: { content: "derived private facts" } }] },
    extractFacts: (...args) => calls.push(args),
  });

  assert.deepEqual(calls, []);
});

test("ordinary requests extract both request and response memory", () => {
  const calls: Array<[string, string, string]> = [];
  runMemoryExtractionGate({
    memoryOwnerId: "api-key-1",
    memorySettings: { enabled: true, maxTokens: 2_000 },
    videoBridgeObserved: false,
    pipelineSessionId: "session-1",
    requestBody: { messages: [{ role: "user", content: "remember my preference" }] },
    responseBody: { choices: [{ message: { content: "preference acknowledged" } }] },
    extractFacts: (...args) => calls.push(args),
  });

  assert.deepEqual(calls, [
    ["remember my preference", "api-key-1", "session-1"],
    ["preference acknowledged", "api-key-1", "session-1"],
  ]);
});

test("attempt logging replaces an adversarial transcript description by exact content", () => {
  const secret = "secret ] [music] transcript";
  const fullText = `[Video description: ${secret}]`;
  const body = {
    messages: [{ role: "user", content: [{ type: "text", text: fullText }] }],
  };
  const redacted = applyVideoBridgeLogRedaction(body, [
    {
      container: "messages",
      fullText,
      redactedText: "[Video description: [redacted-video-transcript]]",
    },
  ]) as typeof body;

  assert.equal(JSON.stringify(redacted).includes(secret), false);
  assert.equal(body.messages[0].content[0].text, fullText);
});
