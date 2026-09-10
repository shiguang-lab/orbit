import assert from "node:assert/strict";
import test from "node:test";
import { createStructuredSSECollector } from "../src/utils/streamPayloadCollector.js";

test("default collector retains a realistic reasoning burst and terminal event", () => {
  const collector = createStructuredSSECollector({ stage: "client_response" });
  for (let i = 0; i < 1_600; i += 1) {
    collector.push({
      type: "response.reasoning_summary_text.delta",
      delta: "token ",
      sequence_number: i,
    });
  }
  collector.push({
    type: "response.completed",
    response: { id: "resp_test", status: "completed", output: [{ type: "message" }] },
  });
  const built = collector.build(undefined, { includeEvents: true });
  assert.equal(built._truncated, undefined);
  assert.ok(
    collector
      .getEvents()
      .some((event) => (event.data as { type?: string } | undefined)?.type === "response.completed")
  );
});

test("explicit small cap still truncates runaway streams", () => {
  const collector = createStructuredSSECollector({ maxEvents: 5 });
  for (let i = 0; i < 10; i += 1) {
    collector.push({ type: "response.output_text.delta", delta: "x", sequence_number: i });
  }
  const built = collector.build(undefined, { includeEvents: false });
  assert.equal(built._truncated, true);
  assert.equal(built._droppedEvents, 5);
});
