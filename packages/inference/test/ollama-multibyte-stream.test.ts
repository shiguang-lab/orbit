import assert from "node:assert/strict";
import test from "node:test";

import { transformToOllama } from "../src/utils/ollamaTransform.ts";

test("Ollama transform preserves UTF-8 code points split across raw chunks", async () => {
  const content = "你好世界🌍";
  const input =
    `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n` +
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n`;
  const bytes = new TextEncoder().encode(input);
  const splitAt = bytes.findIndex((byte, index) => index > 0 && byte >= 0x80 && byte < 0xc0);
  assert.ok(splitAt > 0);

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, splitAt));
      controller.enqueue(bytes.slice(splitAt));
      controller.close();
    },
  });
  const response = transformToOllama(
    new Response(body, { headers: { "content-type": "text/event-stream" } }),
    "test-model"
  );
  const lines = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const streamed = lines.map((line) => line.message?.content ?? "").join("");

  assert.equal(streamed, content);
  assert.ok(!streamed.includes("�"));
});
