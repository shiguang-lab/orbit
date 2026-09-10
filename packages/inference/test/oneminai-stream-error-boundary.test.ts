import assert from "node:assert/strict";
import test from "node:test";
import { OneMinAiExecutor } from "../src/executors/oneminai.js";
import { ensureStreamReadiness } from "../src/utils/streamReadiness.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const originalFetch = globalThis.fetch;

function upstream(text: string): Response {
  return new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode(text)); c.close(); } }), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function executeStream(text: string): Promise<Response> {
  globalThis.fetch = (async () => upstream(text)) as typeof fetch;
  const result = await new OneMinAiExecutor().execute({
    model: "gpt-4o-mini",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: true,
    credentials: { apiKey: "test" },
  } as never);
  return result.response;
}

test.afterEach(() => { globalThis.fetch = originalFetch; });

test("pre-content 1min.ai errors become a sanitized error frame, not assistant content", async () => {
  const response = await executeStream(
    'event: error\ndata: {"error":{"message":"  upstream overloaded  "}}\n\n'
  );
  const text = await response.text();
  assert.match(text, /upstream overloaded/);
  assert.match(text, /"code":"bad_gateway"/);
  assert.doesNotMatch(text, /delta.*assistant/);
  assert.match(text, /data: \[DONE\]/);
});

test("partial 1min.ai content is delivered before the translated stream errors", async () => {
  const response = await executeStream(
    'event: content\ndata: {"content":"kept prefix"}\n\nevent: error\ndata: {"message":"secret detail"}\n\n'
  );
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
  assert.doesNotMatch(text, /secret detail/);
  assert.equal((caught as Error & { statusCode?: number }).message, "1min.ai upstream stream failed");
  assert.equal((caught as Error & { statusCode?: number }).statusCode, 502);
});

test("readiness replay preserves its buffered prefix before a later source error", async () => {
  let pull = 0;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      pull += 1;
      if (pull === 1) controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"prefix"}}]}\n\n'));
      else controller.error(new Error("later failure"));
    },
  }), { headers: { "Content-Type": "text/event-stream" } });
  const ready = await ensureStreamReadiness(response, { timeoutMs: 1_000 });
  assert.equal(ready.ok, true);
  if (!ready.ok) return;
  const reader = ready.response.body!.getReader();
  const first = await reader.read();
  assert.match(decoder.decode(first.value), /prefix/);
  await assert.rejects(reader.read(), /later failure/);
});
