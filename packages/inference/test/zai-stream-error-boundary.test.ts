import assert from "node:assert/strict";
import test from "node:test";
import {
  buildZaiStreamingBody,
  collectZaiNonStreaming,
  parseZaiFrame,
} from "../src/executors/zai-web/stream.js";

function sseStream(...frames: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }
      controller.close();
    },
  });
}

const emitChunk = (
  controller: ReadableStreamDefaultController,
  delta: Record<string, unknown>,
  finish?: string | null,
) => controller.enqueue(new TextEncoder().encode(
  `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish ?? null }] })}\n\n`,
));

async function drain(stream: ReadableStream): Promise<{ output: string; error: unknown }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return { output, error: null };
      output += decoder.decode(next.value as Uint8Array, { stream: true });
    }
  } catch (error) {
    return { output, error };
  }
}

test("recognizes nested HTTP 200 error frames", () => {
  assert.equal(parseZaiFrame({ error: { detail: "signature invalid" } })?.error, "signature invalid");
  assert.equal(parseZaiFrame({ data: { error: { message: "token expired" } } })?.done, true);
  assert.equal(parseZaiFrame({ data: { phase: "answer" } }), null);
});

test("pre-content error closes with an error payload, not stop success", async () => {
  const { output, error } = await drain(buildZaiStreamingBody(
    sseStream({ error: { detail: "signature invalid" } }),
    emitChunk,
    null,
  ));
  assert.equal(error, null);
  assert.match(output, /zai_stream_error/);
  assert.doesNotMatch(output, /finish_reason.*stop|\[DONE\]/);
});

test("mid-stream error preserves content then rejects the stream", async () => {
  const { output, error } = await drain(buildZaiStreamingBody(
    sseStream(
      { data: { phase: "answer", delta_content: "partial" } },
      { error: "captcha expired" },
    ),
    emitChunk,
    null,
  ));
  assert.match(output, /partial/);
  assert.match(String(error), /Z\.ai stream failed: captcha expired/);
  assert.doesNotMatch(output, /finish_reason.*stop|\[DONE\]/);
});

test("non-streaming collection rejects in-band errors", async () => {
  await assert.rejects(
    collectZaiNonStreaming(sseStream({ error: "token expired" })),
    /token expired/,
  );
});
