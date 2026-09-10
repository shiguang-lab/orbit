import assert from "node:assert/strict";
import test from "node:test";
import { buildStreamingResponse } from "../src/executors/grok-web.js";
import { buildGrokToolRegistry } from "../src/executors/grok-web/tool-bridge.js";
import { ensureStreamReadiness } from "../src/utils/streamReadiness.js";

function ndjsonStream(...events: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<{ output: string; error: unknown }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return { output, error: null };
      output += decoder.decode(next.value, { stream: true });
    }
  } catch (error) {
    return { output, error };
  }
}

function grokStream(...events: unknown[]): ReadableStream<Uint8Array> {
  return buildStreamingResponse(
    ndjsonStream(...events),
    "fast",
    "chatcmpl-test",
    1,
    false,
    buildGrokToolRegistry({ messages: [] }),
  );
}

test("pre-content Grok error is promoted to an HTTP failure without leaking details", async () => {
  const readiness = await ensureStreamReadiness(
    new Response(grokStream({ error: { code: "AUTH", message: "private cookie rejected" } }), {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    }),
    { timeoutMs: 1_000, provider: "grok-web", model: "fast" },
  );

  assert.equal(readiness.ok, false);
  assert.equal(readiness.response.status, 502);
  const body = await readiness.response.text();
  assert.match(body, /STREAM_EARLY_EOF/);
  assert.match(body, /Grok upstream stream failed/);
  assert.doesNotMatch(body, /private cookie rejected/);
});

test("mid-stream Grok error preserves output and rejects instead of reporting stop success", async () => {
  const readiness = await ensureStreamReadiness(
    new Response(
      grokStream(
        { result: { response: { token: "partial" } } },
        { error: { code: "CAPTCHA", message: "private captcha detail" } },
      ),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    ),
    { timeoutMs: 1_000, provider: "grok-web", model: "fast" },
  );

  assert.equal(readiness.ok, true);
  const { output, error } = await drain(readiness.response.body!);
  assert.match(output, /partial/);
  assert.match(String(error), /Grok upstream stream failed/);
  assert.doesNotMatch(output, /private captcha detail|finish_reason.*stop|\[DONE\]/);
});
