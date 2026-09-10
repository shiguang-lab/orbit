import assert from "node:assert/strict";
import test from "node:test";
import {
  HuggingChatStreamError,
  readJsonlResponse,
  streamJsonlToOpenAi,
} from "../src/executors/huggingchat/jsonlStream.js";

const encoder = new TextEncoder();

function jsonl(lines: Array<Record<string, unknown>>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(lines.map((line) => JSON.stringify(line)).join("\n") + "\n"));
      controller.close();
    },
  });
}

test("pre-content HTTP 200 JSONL failure rejects with a typed generation error", async () => {
  const chunks = streamJsonlToOpenAi(
    jsonl([{ type: "status", status: "error", message: "generation unavailable" }]),
    "model",
    "id",
    1
  );
  await assert.rejects(chunks.next(), (error: unknown) => {
    assert.ok(error instanceof HuggingChatStreamError);
    assert.equal(error.message, "generation unavailable");
    return true;
  });
});

test("partial JSONL content is yielded before the terminal failure", async () => {
  const chunks = streamJsonlToOpenAi(
    jsonl([
      { type: "stream", token: "kept prefix" },
      { type: "status", status: "error", message: "private failure" },
    ]),
    "model",
    "id",
    1
  );
  assert.match((await chunks.next()).value ?? "", /"role":"assistant"/);
  assert.match((await chunks.next()).value ?? "", /kept prefix/);
  await assert.rejects(chunks.next(), HuggingChatStreamError);
});

test("non-stream JSONL failure uses the same typed boundary", async () => {
  await assert.rejects(
    readJsonlResponse(
      jsonl([{ type: "status", status: "error", message: "generation unavailable" }])
    ),
    HuggingChatStreamError
  );
});
