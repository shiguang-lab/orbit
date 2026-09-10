import assert from "node:assert/strict";
import test from "node:test";

import { FORMATS } from "../src/translator/formats.ts";
import { createSSEStream } from "../src/utils/stream.ts";
import { estimateUsage, hasValidUsage, isEmptyUsage } from "../src/utils/usageTracking.ts";

function parseSSE(text: string): Array<Record<string, unknown>> {
  return text
    .split("\n\n")
    .flatMap((block) => {
      const line = block.split("\n").find((candidate) => candidate.startsWith("data:"));
      const json = line?.slice(5).trim();
      if (!json || json === "[DONE]") return [];
      try {
        return [JSON.parse(json) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

async function runPassthrough(chunks: unknown[]): Promise<Array<Record<string, unknown>>> {
  const stream = createSSEStream({
    mode: "passthrough",
    body: {
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
      stream_options: { include_usage: true },
    },
    sourceFormat: FORMATS.OPENAI,
    clientResponseFormat: FORMATS.OPENAI,
    provider: "test",
  });
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const readAll = (async () => {
    const output: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output.push(value);
    }
    return Buffer.concat(output).toString("utf8");
  })();

  const encoder = new TextEncoder();
  for (const chunk of chunks) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
  }
  await writer.write(encoder.encode("data: [DONE]\n\n"));
  await writer.close();
  return parseSSE(await readAll);
}

test("usage predicates recognize Gemini totalTokenCount and empty usage", () => {
  assert.equal(hasValidUsage({ totalTokenCount: 15 }), true);
  assert.equal(isEmptyUsage({ totalTokenCount: 15 }), false);
  assert.equal(isEmptyUsage({ prompt_tokens: 0, completion_tokens: 0 }), true);
  assert.equal(
    hasValidUsage(
      estimateUsage({ messages: [{ role: "user", content: "hi" }] }, 534, FORMATS.OPENAI)
    ),
    true
  );
});

test("passthrough estimates usage at finish even when include_usage is requested", async () => {
  const parsed = await runPassthrough([
    {
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: "hello world" }, finish_reason: null }],
    },
    {
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    },
  ]);
  const usageChunks = parsed.filter((chunk) => chunk.usage);
  assert.equal(usageChunks.length, 1);
  const usage = usageChunks[0].usage as Record<string, unknown>;
  assert.equal(usage.estimated, true);
  assert.ok(Number(usage.prompt_tokens) > 0);
  assert.ok(Number(usage.completion_tokens) > 0);
});

test("passthrough drops a duplicate trailing usage-only chunk after estimation", async () => {
  const parsed = await runPassthrough([
    {
      id: "chatcmpl-2",
      choices: [{ index: 0, delta: { content: "hello" }, finish_reason: null }],
    },
    {
      id: "chatcmpl-2",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    },
    { id: "chatcmpl-2", choices: [], usage: { prompt_tokens: 8, completion_tokens: 6 } },
  ]);
  assert.equal(parsed.filter((chunk) => chunk.usage).length, 1);
});

test("passthrough does not invent usage for an empty response", async () => {
  const parsed = await runPassthrough([
    {
      id: "chatcmpl-3",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    },
  ]);
  assert.equal(parsed.some((chunk) => chunk.usage), false);
});
