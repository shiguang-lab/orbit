import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { proxyFetch } from "@orbit/inference/utils/proxyFetch";
import {
  buildInternalChatRequest,
  buildInternalImageGenerationRequest,
  detectTestKind,
} from "../src/models/model-test.runner.js";
import { extractComboTestResponseText } from "../src/combos/combo-test.js";



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

test("detectTestKind correctly identifies image models", () => {
  // Cliproxy NAS image model
  const cliproxyImg = detectTestKind("openai-compatible-cliproxy-nas/gpt-image-2", null);
  assert.equal(cliproxyImg.isImageGeneration, true);
  assert.equal(cliproxyImg.isRerank, false);
  assert.equal(cliproxyImg.isEmbedding, false);
  assert.equal(cliproxyImg.isAudioTranscription, false);

  // OpenAI DALL-E models
  const dalle3 = detectTestKind("openai/dall-e-3", null);
  assert.equal(dalle3.isImageGeneration, true);

  // Flux model
  const flux = detectTestKind("bfl/flux-schnell", null);
  assert.equal(flux.isImageGeneration, true);

  // Stable diffusion model
  const sd = detectTestKind("stability/stable-diffusion-xl", null);
  assert.equal(sd.isImageGeneration, true);

  // Custom model with supportedEndpoints
  const customEndpoints = detectTestKind("custom/special-model", {
    supportedEndpoints: ["images/generations"],
  });
  assert.equal(customEndpoints.isImageGeneration, true);

  // Custom model with apiFormat
  const customFormat = detectTestKind("custom/special-model", {
    apiFormat: "images",
  });
  assert.equal(customFormat.isImageGeneration, true);

  // Provider node with apiType
  const nodeApiTypeImg = detectTestKind("node/model-xyz", null, "images/generations");
  assert.equal(nodeApiTypeImg.isImageGeneration, true);

  // Chat models should NOT be identified as image models
  const chatGpt = detectTestKind("openai/gpt-4o", null);
  assert.equal(chatGpt.isImageGeneration, false);

  const claude = detectTestKind("anthropic/claude-3-5-sonnet", null);
  assert.equal(claude.isImageGeneration, false);

  const embedding = detectTestKind("openai/text-embedding-3-small", null);
  assert.equal(embedding.isImageGeneration, false);
  assert.equal(embedding.isEmbedding, true);
});

test("buildInternalImageGenerationRequest creates valid Request that targets /v1/images/generations", async () => {
  let receivedMethod = "";
  let receivedInternalTest = "";
  let receivedConnection = "";
  let receivedBody = "";

  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      receivedMethod = req.method || "";
      receivedInternalTest = req.headers["x-internal-test"] as string;
      receivedConnection = req.headers["x-orbit-connection"] as string;
      receivedBody = data;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          created: 1710000000,
          data: [{ url: "https://example.com/output.png" }],
        })
      );
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  process.env.EDGE_GATEWAY_URL = `http://127.0.0.1:${port}`;

  try {
    const controller = new AbortController();
    const req = buildInternalImageGenerationRequest(
      { model: "openai-compatible-cliproxy-nas/gpt-image-2", prompt: "test", n: 1 },
      controller.signal,
      "conn-cliproxy-123"
    );

    assert.equal(req.url, `http://127.0.0.1:${port}/v1/images/generations`);
    assert.equal(req.method, "POST");

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
    assert.equal(receivedConnection, "conn-cliproxy-123");
    assert.deepEqual(JSON.parse(receivedBody), {
      model: "openai-compatible-cliproxy-nas/gpt-image-2",
      prompt: "test",
      n: 1,
    });

    const json = await res.json();
    const extracted = extractComboTestResponseText(json);
    assert.equal(extracted, "[Image generated successfully]");
  } finally {
    delete process.env.EDGE_GATEWAY_URL;
    server.close();
  }
});

test("extractComboTestResponseText correctly extracts b64_json image outputs", () => {
  const b64Response = {
    created: 1710000000,
    data: [{ b64_json: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }],
  };
  const extracted = extractComboTestResponseText(b64Response);
  assert.equal(extracted, "[Image generated successfully]");
});
