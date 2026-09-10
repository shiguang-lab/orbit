import assert from "node:assert/strict";
import test from "node:test";

import { validateResponseQuality } from "../src/services/combo/validateQuality.ts";

const silentLog = { warn() {} };
const makeResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

test("finish_reason length rejects empty final content below the reasoning ratio threshold", async () => {
  const result = await validateResponseQuality(
    makeResponse({
      choices: [
        {
          message: { content: null, reasoning: "unfinished reasoning" },
          finish_reason: "length",
        },
      ],
      usage: { completion_tokens: 1024, completion_tokens_details: { reasoning_tokens: 645 } },
    }),
    false,
    silentLog
  );
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /truncated at token limit/);
});

test("finish_reason max_tokens is also a direct truncation signal", async () => {
  const result = await validateResponseQuality(
    makeResponse({
      choices: [
        {
          message: { content: null, reasoning_content: "unfinished reasoning" },
          finish_reason: "max_tokens",
        },
      ],
      usage: { completion_tokens: 512, reasoning_tokens: 100 },
    }),
    false,
    silentLog
  );
  assert.equal(result.valid, false);
});

test("missing finish_reason retains the existing low-ratio behavior", async () => {
  const result = await validateResponseQuality(
    makeResponse({
      choices: [{ message: { content: null, reasoning_content: "unfinished reasoning" } }],
      usage: { completion_tokens: 1024, reasoning_tokens: 645 },
    }),
    false,
    silentLog
  );
  assert.equal(result.valid, true);
});

test("finish_reason stop still falls through to the existing ratio heuristic", async () => {
  const result = await validateResponseQuality(
    makeResponse({
      choices: [
        {
          message: { content: null, reasoning_content: "unfinished reasoning" },
          finish_reason: "stop",
        },
      ],
      usage: { completion_tokens: 4096, reasoning_tokens: 3800 },
    }),
    false,
    silentLog
  );
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /reasoning consumed/);
});
