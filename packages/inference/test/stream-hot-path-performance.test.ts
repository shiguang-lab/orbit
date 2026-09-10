import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { memoLookup, memoStore, clearMemoStore } from "../src/services/compression/resultMemo.ts";
import { createSSEStream } from "../src/utils/stream.ts";

test("SSE stream honors a caller-provided high-water mark", async () => {
  const stream = createSSEStream({ highWaterMark: 7 });
  const writer = stream.writable.getWriter();
  assert.equal(writer.desiredSize, 7);
  await writer.abort();
});

test("compression memo clones both stored and returned values", () => {
  clearMemoStore();
  const source = {
    body: { messages: [{ role: "user", content: "hello" }] },
    stats: { originalTokens: 10, compressedTokens: 5, savedTokens: 5, savingsPercent: 50 },
  } as any;
  memoStore("clone", source);
  source.body.messages[0].content = "mutated-after-store";

  const first = memoLookup("clone") as any;
  assert.equal(first.body.messages[0].content, "hello");
  first.body.messages[0].content = "mutated-after-read";
  assert.equal((memoLookup("clone") as any).body.messages[0].content, "hello");
});

test("long-lived provider caches are bounded and ZCode defers concatenation until a frame is complete", () => {
  const source = (path: string) =>
    fs.readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

  assert.match(source("executors/adapta-web.ts"), /const SESSION_CACHE_MAX = 100/);
  assert.match(source("services/gigachatAuth.ts"), /const TOKEN_CACHE_MAX = 100/);
  assert.match(source("services/gigachatAuth.ts"), /const INFLIGHT_MAX = 50/);
  assert.match(source("services/browserPool.ts"), /const PENDING_CONTEXT_TTL_MS = 5 \* 60 \* 1000/);

  const zcode = source("executors/zcodeProtocol.ts");
  assert.match(zcode, /if \(this\.pendingBytes < firstFrameLength\) return;/);
  assert.match(zcode, /Buffer\.concat\(this\.pendingChunks, this\.pendingBytes\)/);
  assert.doesNotMatch(zcode, /Buffer\.concat\(\[this\.outputBuffer, chunk\]\)/);
});
