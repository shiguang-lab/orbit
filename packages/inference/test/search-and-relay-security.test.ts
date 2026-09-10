import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SEARCH_PROVIDERS } from "../src/config/searchRegistry.js";
import { resolveSearchBaseUrl } from "../src/handlers/search.js";
import { stripSensitiveResponseHeaders } from "../src/utils/upstreamResponseHeaders.js";

test("caller baseUrl cannot redirect a keyed search provider", () => {
  for (const provider of Object.values(SEARCH_PROVIDERS).filter(
    (candidate) => candidate.authType === "apikey"
  )) {
    assert.throws(() =>
      resolveSearchBaseUrl(provider, {
        query: "test",
        searchType: "web",
        maxResults: 5,
        providerOptions: { baseUrl: "https://attacker.example" },
      })
    );
    assert.notEqual(provider.allowClientBaseUrlOverride, true);
  }
});

test("operator baseUrl wins while opted-in keyless SearXNG accepts caller override", () => {
  const provider = SEARCH_PROVIDERS["searxng-search"]!;
  assert.equal(provider.authType, "none");
  assert.equal(provider.allowClientBaseUrlOverride, true);
  assert.equal(
    resolveSearchBaseUrl(provider, {
      query: "test",
      searchType: "web",
      maxResults: 5,
      providerOptions: { baseUrl: "https://caller.example/search" },
      providerSpecificData: { baseUrl: "https://operator.example/search/" },
    }),
    "https://operator.example/search"
  );
});

test("relay response headers drop credentials, cookies, and stale framing", () => {
  const headers = stripSensitiveResponseHeaders(
    new Headers([
      ["authorization", "Bearer secret"],
      ["x-api-key", "secret"],
      ["set-cookie", "session=secret"],
      ["content-length", "999"],
      ["x-request-id", "keep"],
    ])
  );
  assert.equal(headers.get("authorization"), null);
  assert.equal(headers.get("x-api-key"), null);
  assert.equal(headers.get("set-cookie"), null);
  assert.equal(headers.get("content-length"), null);
  assert.equal(headers.get("x-request-id"), "keep");
});

test("both Orbit bifrost relay paths use the shared sensitive-header strip", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  for (const relative of [
    "apps/gateway/src/relay-chat/relay-chat.handler.ts",
    "apps/gateway/src/relay-bifrost/relay-bifrost.handler.ts",
  ]) {
    const source = readFileSync(join(root, relative), "utf8");
    assert.match(source, /stripSensitiveResponseHeaders/);
    assert.doesNotMatch(source, /new Headers\(upstream\.headers\)/);
  }
});
