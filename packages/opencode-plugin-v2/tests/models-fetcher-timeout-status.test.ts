import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultOrbitModelsFetcher } from "../src/shared/models-map.js";
import { resolveTimeouts, DEFAULT_MODELS_TIMEOUT_MS } from "../src/options.js";
import type { PluginOptions } from "../src/options.js";

describe("#12602 models fetcher timeout + HTTP status", () => {
  it("attaches statusCode/status on HTTP 401", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "authentication expired" }), {
        status: 401,
        statusText: "Unauthorized",
      })) as typeof fetch;
    try {
      await assert.rejects(
        () => defaultOrbitModelsFetcher("https://gw.example.com/v1", "test-key"),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          const rec = err as Error & { statusCode?: number; status?: number };
          assert.equal(rec.statusCode, 401);
          assert.equal(rec.status, 401);
          assert.match(rec.message, /401/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("models timeout default is 30s; explicit timeoutMs still wins", () => {
    const empty = {} as Pick<PluginOptions, "timeoutMs" | "timeouts">;
    assert.equal(resolveTimeouts(empty).models, DEFAULT_MODELS_TIMEOUT_MS);
    assert.equal(DEFAULT_MODELS_TIMEOUT_MS, 30_000);
    const explicit = { timeoutMs: 12_345 } as Pick<PluginOptions, "timeoutMs" | "timeouts">;
    assert.equal(resolveTimeouts(explicit).models, 12_345);
  });
});
