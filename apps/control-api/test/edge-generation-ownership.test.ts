import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { INTERNAL_SERVICE_AUTH_HEADER } from "@orbit/auth/internal-service";
import { forwardEdgeHttpRequest } from "../src/edge-runtime/client.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("control-generated chat requests cross the edge HTTP ownership boundary", () => {
  for (const relativePath of [
    "apps/control-api/src/chaos/runtime/executor.ts",
    "apps/control-api/src/evals/evals.service.ts",
    "apps/control-api/src/issue-agent/issue-agent.service.ts",
  ]) {
    const source = read(relativePath);
    assert.match(source, /forwardEdgeHttpRequest/);
    assert.doesNotMatch(source, /inference\/services\/chat-completions-compat/);
  }
});

test("model probes rely on edge-owned rate limiting only", () => {
  const source = read("apps/control-api/src/models/model-test.runner.ts");
  assert.doesNotMatch(source, /inference\/services\/rateLimitManager/);
  assert.doesNotMatch(source, /\bwithRateLimit\b/);
  assert.match(source, /AbortController/);
  assert.match(source, /timedOut/);
  assert.match(source, /fetch\(request\)/);
  assert.match(source, /res\.status === 429/);
});

test("edge HTTP forwarding preserves path, auth, abort signal, and raw response", async () => {
  const originalFetch = globalThis.fetch;
  const originalEdgeUrl = process.env.EDGE_GATEWAY_URL;
  const originalInternalToken = process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN;
  const controller = new AbortController();
  const edgeResponse = new Response("data: edge-owned\n\n", {
    headers: { "Content-Type": "text/event-stream" },
  });
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  process.env.EDGE_GATEWAY_URL = "http://edge.internal:8787/";
  process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = "test-internal-token";
  globalThis.fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return edgeResponse;
  };

  try {
    const source = new Request("http://control.local/api/v1/chat/completions?trace=1", {
      method: "POST",
      headers: {
        Authorization: "Bearer caller-key",
        "Content-Type": "application/json",
        "X-Routing-Provider": "provider-a",
      },
      body: JSON.stringify({ model: "provider-a/model-a", stream: true }),
      signal: controller.signal,
    });

    const response = await forwardEdgeHttpRequest(source);
    assert.equal(response, edgeResponse);
    assert.equal(capturedUrl, "http://edge.internal:8787/api/v1/chat/completions?trace=1");
    assert.equal(capturedInit?.method, "POST");
    assert.equal(capturedInit?.signal, source.signal);
    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get("authorization"), "Bearer caller-key");
    assert.equal(headers.get("x-routing-provider"), "provider-a");
    assert.equal(headers.get(INTERNAL_SERVICE_AUTH_HEADER), "test-internal-token");
    assert.deepEqual(
      JSON.parse(new TextDecoder().decode(capturedInit?.body as ArrayBuffer)),
      { model: "provider-a/model-a", stream: true },
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEdgeUrl === undefined) delete process.env.EDGE_GATEWAY_URL;
    else process.env.EDGE_GATEWAY_URL = originalEdgeUrl;
    if (originalInternalToken === undefined) delete process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN;
    else process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = originalInternalToken;
  }
});
