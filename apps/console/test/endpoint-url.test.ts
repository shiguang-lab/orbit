import assert from "node:assert/strict";
import test from "node:test";
import { buildEndpointUrl } from "../src/features/endpoints/endpoint-url.ts";

test("SDK bases and origin bases produce one protocol prefix for every endpoint", () => {
  for (const base of ["https://gateway.example", "https://gateway.example/", "https://gateway.example/v1", "https://gateway.example/v1/", "https://gateway.example/api/v1/"]) {
    for (const path of ["/v1/chat/completions", "/v1/responses", "/v1/completions", "/v1/messages", "/v1/embeddings", "/v1/images/generations", "/v1/images/edits", "/v1/audio/transcriptions", "/v1/audio/speech", "/v1/models", "/api/v1/vscode/{token}/chat/completions"]) {
      assert.equal(buildEndpointUrl(base, path), `https://gateway.example${path}`);
    }
  }
});

test("preserves gateway mount paths and local origins", () => {
  assert.equal(buildEndpointUrl("https://example.com/gateway/v1/", "/v1/models"), "https://example.com/gateway/v1/models");
  assert.equal(buildEndpointUrl("http://127.0.0.1:8787/v1", "/v1/images/generations"), "http://127.0.0.1:8787/v1/images/generations");
});
