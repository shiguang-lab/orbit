import assert from "node:assert/strict";
import test from "node:test";
import { createStructuredSSECollector } from "../src/utils/streamPayloadCollector.js";

// Ported from upstream #12243 (3383adbbd) "defer cloneLogPayload until after SSE
// collector cap check". push() now hands the reducer the CALLER'S payload (no clone),
// so each reducer must snapshot what it keeps; the deep clone runs only for events
// that survive the retention cap. These tests pin both halves of that contract.

test("push() defers cloneLogPayload until after the cap check — dropped events still feed the summary", () => {
  const collector = createStructuredSSECollector({
    maxEvents: 2,
    format: "openai",
    fallbackModel: "test-model",
  });

  collector.push({
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1,
    model: "test-model",
    choices: [{ index: 0, delta: { role: "assistant", content: "A" } }],
  });
  collector.push({ choices: [{ index: 0, delta: { content: "B" } }] });
  collector.push({ choices: [{ index: 0, delta: { content: "C" } }] });

  assert.equal(collector.getEvents().length, 2, "only 2 events retained (cap = 2)");

  const summary = collector.getSummary() as Record<string, unknown>;
  const choices = summary.choices as Array<{ message: { content: string | null } }>;
  const content = choices?.[0]?.message?.content;
  assert.ok(
    typeof content === "string" && content.includes("A") && content.includes("B") && content.includes("C"),
    "summary must reflect ALL pushed events (including dropped) — reducer ingests every chunk"
  );
});

test("push() stores a snapshot — mutating the original payload after push does not affect the stored event", () => {
  const collector = createStructuredSSECollector({ maxEvents: 5 });
  const payload = {
    id: "chatcmpl-snap",
    choices: [{ index: 0, delta: { content: "original" } }],
  };

  collector.push(payload);
  const stored = collector.getEvents()[0];

  payload.id = "changed";
  payload.choices[0].delta.content = "mutated";

  assert.equal(
    (stored.data as Record<string, unknown>).id,
    "chatcmpl-snap",
    "stored event must retain the original id (snapshot, not reference)"
  );
  const storedChoices = (stored.data as Record<string, unknown>).choices as Array<
    Record<string, unknown>
  >;
  assert.equal(
    (storedChoices[0] as { delta?: { content?: string } }).delta?.content,
    "original",
    "stored event must retain the original content (snapshot, not reference)"
  );
});

test("summary snapshot isolation — OpenAI: mutating the payload after push does not change getSummary()", () => {
  const collector = createStructuredSSECollector({
    maxEvents: 10,
    format: "openai",
    fallbackModel: "test-model",
  });
  const payload = {
    id: "chatcmpl-snap-openai",
    object: "chat.completion.chunk",
    created: 1,
    model: "test-model",
    choices: [{ index: 0, delta: { role: "assistant", content: "Hello" } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  };
  collector.push(payload);
  const before = JSON.parse(JSON.stringify(collector.getSummary()));

  payload.id = "MUTATED_ID";
  payload.choices[0].delta.content = "MUTATED";
  payload.usage.prompt_tokens = 9999;

  const after = collector.getSummary() as Record<string, unknown>;
  assert.equal(after.id, before.id, "OpenAI summary id must not change after payload mutation");
  assert.equal(
    ((after.choices as Array<{ message: { content: string } }>)[0]).message.content,
    before.choices[0].message.content,
    "OpenAI summary content must not change after payload mutation"
  );
  assert.deepEqual(after.usage, before.usage, "OpenAI summary usage must not change after payload mutation");
});

test("summary snapshot isolation — Responses: mutating the payload after push does not change getSummary()", () => {
  const collector = createStructuredSSECollector({
    maxEvents: 10,
    format: "openai-responses",
    fallbackModel: "test-model",
  });
  const payload: Record<string, unknown> = {
    type: "response.completed",
    response: {
      id: "resp_snap",
      model: "responses-test",
      status: "completed",
      created_at: 1700000000,
      output: [{ type: "message", content: [{ type: "output_text", text: "hi" }] }],
      metadata: { tag: "original" },
      usage: { input_tokens: 3, output_tokens: 1 },
    },
  };
  collector.push(payload);
  const before = JSON.parse(JSON.stringify(collector.getSummary()));

  const response = payload.response as Record<string, unknown>;
  response.id = "MUTATED_RESP";
  (response.output as Array<Record<string, unknown>>)[0].content = [
    { type: "output_text", text: "HACKED" },
  ];
  (response.metadata as Record<string, unknown>).tag = "mutated";

  const after = collector.getSummary() as Record<string, unknown>;
  assert.equal(after.id, before.id, "Responses summary id must not change after payload mutation");
  assert.deepEqual(after.usage, before.usage, "Responses summary usage must not change");
  assert.deepEqual(after.metadata, before.metadata, "Responses summary metadata must not change");
  assert.deepEqual(after.output, before.output, "Responses summary output must not change");
});

test("summary snapshot isolation — Claude: mutating the payload after push does not change getSummary()", () => {
  const collector = createStructuredSSECollector({
    maxEvents: 10,
    format: "claude",
    fallbackModel: "test-model",
  });
  const payload: Record<string, unknown> = {
    type: "message_start",
    message: { id: "msg_snap", model: "claude-3", role: "assistant", usage: { input_tokens: 10 } },
    context_management: { applied_edits: [{ type: "clear_tool_uses" }] },
  };
  collector.push(payload);
  const before = JSON.parse(JSON.stringify(collector.getSummary()));

  const message = payload.message as Record<string, unknown>;
  message.id = "MUTATED_MSG";
  message.model = "MUTATED_MODEL";
  (payload.context_management as Record<string, unknown>).applied_edits = [];

  const after = collector.getSummary();
  assert.deepEqual(after, before, "Claude summary (incl. context_management) must not change");
});

test("summary snapshot isolation — Gemini: mutating the payload after push does not change getSummary()", () => {
  const collector = createStructuredSSECollector({
    maxEvents: 10,
    format: "gemini",
    fallbackModel: "test-model",
  });
  const payload: Record<string, unknown> = {
    modelVersion: "gemini-2.0",
    candidates: [{ content: { role: "model", parts: [{ text: "Hello" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 10 },
  };
  collector.push(payload);
  const before = JSON.parse(JSON.stringify(collector.getSummary()));

  payload.modelVersion = "MUTATED_MODEL";
  const candidates = payload.candidates as Array<{ content: { parts: Array<{ text: string }> } }>;
  candidates[0].content.parts[0].text = "MUTATED";
  (payload.usageMetadata as Record<string, unknown>).promptTokenCount = 9999;

  assert.deepEqual(collector.getSummary(), before, "Gemini summary must not change after payload mutation");
});

test("getEvents() defensive-copy: mutating a returned slice does not affect later calls", () => {
  const collector = createStructuredSSECollector({ maxEvents: 5 });
  collector.push({ choices: [{ index: 0, delta: { content: "A" } }] });
  collector.push({ choices: [{ index: 0, delta: { content: "B" } }] });

  const first = collector.getEvents() as Array<Record<string, unknown>>;
  const second = collector.getEvents() as Array<Record<string, unknown>>;

  first[0].data = { MUTATED: true };
  first[0].timestamp = "MUTATED_TIME";
  first.push({ data: { INJECTED: true } });

  assert.equal(second.length, 2, "second call must still return 2 events (push to first did not leak)");
  assert.notEqual((second[0].data as Record<string, unknown>).MUTATED, true);
});
