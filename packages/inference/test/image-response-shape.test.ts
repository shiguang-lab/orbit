import assert from "node:assert/strict";
import test from "node:test";

import { handleImageGeneration } from "../src/handlers/imageGeneration.ts";
import { normalizeImageComboResponsePayload } from "../src/services/imageCombo.ts";

function codexImageSse(result = "YWJjZA==") {
  return `event: response.output_item.done\ndata: ${JSON.stringify({
    type: "response.output_item.done",
    item: {
      type: "image_generation_call",
      id: "ig_test",
      status: "completed",
      revised_prompt: "a kitten",
      result,
    },
  })}\n\ndata: [DONE]\n\n`;
}

async function withCodexFetch<T>(run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(codexImageSse(), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Codex image generation defaults to b64_json when response_format is omitted", async () => {
  const result = await withCodexFetch(() =>
    handleImageGeneration({
      body: { model: "codex/gpt-5.6-sol", prompt: "kitten" },
      credentials: { accessToken: "codex-token" },
      log: null,
    })
  );

  assert.equal(result.success, true);
  const images = (result as { data: { data: Array<Record<string, unknown>> } }).data.data;
  assert.equal(images[0].b64_json, "YWJjZA==");
  assert.equal(images[0].url, undefined);
});

test("Codex image generation emits a data URL only when explicitly requested", async () => {
  const result = await withCodexFetch(() =>
    handleImageGeneration({
      body: { model: "codex/gpt-5.6-sol", prompt: "kitten", response_format: "url" },
      credentials: { accessToken: "codex-token" },
      log: null,
    })
  );

  assert.equal(result.success, true);
  const images = (result as { data: { data: Array<Record<string, unknown>> } }).data.data;
  assert.equal(images[0].url, "data:image/png;base64,YWJjZA==");
  assert.equal(images[0].b64_json, undefined);
});

test("image combo preserves the public OpenAI wrapper", () => {
  const payload = { created: 123, data: [{ b64_json: "YWJjZA==" }] };
  assert.equal(normalizeImageComboResponsePayload(payload), payload);
  assert.deepEqual(normalizeImageComboResponsePayload(payload.data, 456), {
    created: 456,
    data: payload.data,
  });
});
