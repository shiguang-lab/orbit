import assert from "node:assert/strict";
import test from "node:test";
import { PerplexityWebExecutor } from "../src/executors/perplexity-web.js";
import { __setTlsFetchOverrideForTesting } from "../src/services/perplexityTlsClient.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function eventStream(events: Array<Record<string, unknown>>): ReadableStream<Uint8Array> {
  const wire =
    events.map((event) => `event: message\r\ndata: ${JSON.stringify(event)}\r\n\r\n`).join("") +
    "event: end_of_stream\r\n\r\n";
  return new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(wire)); controller.close(); } });
}

async function execute(events: Array<Record<string, unknown>>): Promise<Response> {
  __setTlsFetchOverrideForTesting(async () => ({
    status: 200,
    headers: new Headers({ "Content-Type": "text/event-stream" }),
    text: null,
    body: eventStream(events),
  }));
  const result = await new PerplexityWebExecutor().execute({
    model: "pplx-auto",
    body: { messages: [{ role: "user", content: "hi" }], stream: true },
    stream: true,
    credentials: { apiKey: "test-cookie" },
    signal: AbortSignal.timeout(5_000),
    log: null,
  });
  return result.response;
}

test.afterEach(() => __setTlsFetchOverrideForTesting(null));

test("pre-content Perplexity failure is a canonical error frame, not assistant text", async () => {
  const response = await execute([{ error_code: "PPLX_ERROR", error_message: "private failure" }]);
  const text = await response.text();
  assert.match(text, /PPLX_STREAM_ERROR/);
  assert.match(text, /Perplexity upstream stream failed/);
  assert.doesNotMatch(text, /private failure/);
  assert.doesNotMatch(text, /"role":"assistant"/);
});

test("partial Perplexity output remains readable before a safe terminal error", async () => {
  const response = await execute([
    {
      backend_uuid: "failed-session",
      blocks: [{ intended_usage: "markdown", markdown_block: { chunks: ["kept prefix"], progress: "IN_PROGRESS" } }],
      status: "PENDING",
    },
    { error_code: "PPLX_ERROR", error_message: "private detail" },
  ]);
  const reader = response.body!.getReader();
  let text = "";
  let caught: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    caught = error;
  }
  assert.match(text, /kept prefix/);
  assert.doesNotMatch(text, /private detail/);
  assert.equal((caught as Error & { statusCode?: number }).message, "Perplexity upstream stream failed");
  assert.equal((caught as Error & { statusCode?: number }).statusCode, 502);
});
