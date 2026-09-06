import assert from "node:assert/strict";
import test from "node:test";

import { createLogStream } from "../src/cli/runtime/log-streamer.mjs";

test("log stream forwards filters and headers to the CLI endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response("first\nsecond\n", { status: 200 });
  };

  try {
    const headers = { Authorization: "Bearer test" };
    const { stream } = createLogStream({
      baseUrl: "https://gateway.example",
      filters: ["error", "warn"],
      follow: true,
      headers,
    });
    assert.equal(await new Response(stream).text(), "first\nsecond\n");
    assert.equal(request.url, "https://gateway.example/api/cli-tools/logs?follow=true&filter=error%2Cwarn");
    assert.equal(request.init.headers, headers);
    assert.equal(request.init.signal instanceof AbortSignal, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("log stream exposes unsuccessful HTTP responses as stream errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503, statusText: "Unavailable" });

  try {
    const { stream } = createLogStream({ baseUrl: "https://gateway.example" });
    await assert.rejects(new Response(stream).text(), /HTTP 503: Unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cancelling a log stream aborts its request", async () => {
  const originalFetch = globalThis.fetch;
  let signal;
  globalThis.fetch = (_url, init) => {
    signal = init.signal;
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  };

  try {
    const { stream } = createLogStream({ baseUrl: "https://gateway.example", follow: true });
    await stream.cancel();
    assert.equal(signal.aborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
