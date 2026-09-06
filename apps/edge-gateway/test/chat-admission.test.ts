import assert from "node:assert/strict";
import test from "node:test";

import { withChatAdmission } from "../src/chat-admission.ts";

test("edge chat admission forwards accepted requests and route arguments", async () => {
  let receivedArg: unknown;
  const handler = withChatAdmission(async (_request, arg) => {
    receivedArg = arg;
    return new Response(null, { status: 204 });
  }, { largeBodyBytes: 1024, hardMaxBytes: 2048 });

  const response = await handler(
    new Request("http://localhost/v1/chat/completions", { method: "POST", body: "{}" }),
    { params: { provider: "test" } },
  );

  assert.equal(response.status, 204);
  assert.deepEqual(receivedArg, { params: { provider: "test" } });
});

test("edge chat admission rejects a declared body above the hard limit", async () => {
  let called = false;
  const handler = withChatAdmission(async () => {
    called = true;
    return new Response(null, { status: 204 });
  }, { hardMaxBytes: 2 });

  const response = await handler(new Request("http://localhost/v1/chat/completions", {
    method: "POST",
    headers: { "content-length": "3" },
    body: "{}",
  }));

  assert.equal(response.status, 413);
  assert.equal(called, false);
});
