import assert from "node:assert/strict";
import test from "node:test";
import { AdaptaWebExecutor } from "../src/executors/adapta-web.js";

const originalFetch = globalThis.fetch;

function installFetch(upstreamBody: string): void {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/v1/client")) {
      return Response.json({ response: { sessions: [{ id: "session", status: "active" }] } });
    }
    if (url.endsWith("/v1/client/sessions/session/tokens")) {
      return Response.json({ jwt: "eyJ.fixture.signature" });
    }
    if (url.endsWith("/api/chat/stream/v1")) {
      return new Response(upstreamBody, { headers: { "Content-Type": "text/event-stream" } });
    }
    throw new Error(`unexpected URL ${url}`);
  }) as typeof fetch;
}

async function execute(body: string): Promise<Response> {
  installFetch(body);
  const result = await new AdaptaWebExecutor().execute({
    model: "adapta-one",
    body: { messages: [{ role: "user", content: "hello" }] },
    stream: false,
    credentials: { apiKey: "fixture-client" },
    signal: null,
  });
  return result.response;
}

test.afterEach(() => { globalThis.fetch = originalFetch; });

test("HTTP 200 SSE type:error becomes a generic structured 502", async () => {
  const response = await execute(
    `data: ${JSON.stringify({ type: "error", errorText: "private SQL token=secret" })}\n\n`
  );
  assert.equal(response.status, 502);
  const payload = await response.json() as { error?: { message?: string; code?: string } };
  assert.equal(payload.error?.message, "Adapta upstream error");
  assert.equal(payload.error?.code, "bad_gateway");
  assert.doesNotMatch(JSON.stringify(payload), /private SQL|secret/);
});

test("normal non-stream text deltas remain a successful completion", async () => {
  const response = await execute([
    `data: ${JSON.stringify({ type: "text-delta", id: "quick-response", delta: "Loading" })}`,
    `data: ${JSON.stringify({ type: "text-delta", id: "answer", delta: "Hello" })}`,
    `data: ${JSON.stringify({ type: "text-delta", id: "answer", delta: " world" })}`,
    `data: ${JSON.stringify({ type: "done" })}`,
    "",
  ].join("\n\n"));
  assert.equal(response.status, 200);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  assert.equal(payload.choices?.[0]?.message?.content, "Hello world");
});
