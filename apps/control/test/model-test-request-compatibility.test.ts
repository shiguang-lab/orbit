import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { proxyFetch } from "@orbit/inference/utils/proxyFetch";
import { buildInternalChatRequest } from "../src/models/model-test.runner.js";

test("proxyFetch seamlessly handles Request objects without throwing TypeError", async () => {
  let receivedMethod = "";
  let receivedHeader = "";
  let receivedBody = "";

  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      receivedMethod = req.method || "";
      receivedHeader = req.headers["x-test-header"] as string;
      receivedBody = data;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;

  try {
    const request = new Request(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test-Header": "orbit-verified",
      },
      body: JSON.stringify({ model: "test-model", messages: [{ role: "user", content: "hi" }] }),
    });

    const res = await proxyFetch(request);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { ok: boolean };
    assert.equal(json.ok, true);
    assert.equal(receivedMethod, "POST");
    assert.equal(receivedHeader, "orbit-verified");
    assert.deepEqual(JSON.parse(receivedBody), {
      model: "test-model",
      messages: [{ role: "user", content: "hi" }],
    });
  } finally {
    server.close();
  }
});

test("buildInternalChatRequest creates valid Request that works with global fetch", async () => {
  let receivedMethod = "";
  let receivedInternalTest = "";
  let receivedBody = "";

  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      receivedMethod = req.method || "";
      receivedInternalTest = req.headers["x-internal-test"] as string;
      receivedBody = data;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "pong" } }] }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  process.env.EDGE_GATEWAY_URL = `http://127.0.0.1:${port}`;

  try {
    const controller = new AbortController();
    const req = buildInternalChatRequest(
      { model: "cpa-nas/claude-3-5-sonnet", messages: [{ role: "user", content: "ping" }] },
      controller.signal,
      "conn-123"
    );

    assert.equal(req.url, `http://127.0.0.1:${port}/v1/chat/completions`);
    assert.equal(req.method, "POST");

    // Test calling fetch with the Request directly (as patched by proxyFetch)
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body ?? undefined,
      signal: req.signal,
      ...(req.body ? { duplex: "half" } : {}),
    } as RequestInit);

    assert.equal(res.status, 200);
    assert.equal(receivedMethod, "POST");
    assert.equal(receivedInternalTest, "combo-health-check");
    assert.deepEqual(JSON.parse(receivedBody), {
      model: "cpa-nas/claude-3-5-sonnet",
      messages: [{ role: "user", content: "ping" }],
    });
  } finally {
    delete process.env.EDGE_GATEWAY_URL;
    server.close();
  }
});

test("calling patched globalThis.fetch directly with Request object succeeds", async () => {
  let receivedMethod = "";
  let receivedHeader = "";
  let receivedBody = "";

  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      receivedMethod = req.method || "";
      receivedHeader = req.headers["x-direct-request"] as string;
      receivedBody = data;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ passed: true }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;

  try {
    const request = new Request(`http://127.0.0.1:${port}/direct-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Direct-Request": "yes",
      },
      body: JSON.stringify({ direct: "call" }),
    });

    // globalThis.fetch is patched by proxyFetch.ts when @orbit/inference is loaded
    const res = await fetch(request);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { passed: boolean };
    assert.equal(json.passed, true);
    assert.equal(receivedMethod, "POST");
    assert.equal(receivedHeader, "yes");
    assert.deepEqual(JSON.parse(receivedBody), { direct: "call" });
  } finally {
    server.close();
  }
});
