import assert from "node:assert/strict";
import test from "node:test";

import { handleAiHordeImageGeneration } from "../src/handlers/imageGeneration/providers/aihorde.ts";
import { aiHordeImageCatalog } from "../src/services/aihordeImageCatalog.ts";

const originalFetch = globalThis.fetch;

function stubQueue(waitTimeSeconds: number): string[] {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${(init?.method || "GET").toUpperCase()} ${url}`);
    if (url.endsWith("/v2/generate/async")) {
      return new Response(JSON.stringify({ id: "queue-budget-job" }), { status: 202 });
    }
    if (url.includes("/v2/generate/check/")) {
      return new Response(
        JSON.stringify({
          done: false,
          faulted: false,
          is_possible: true,
          wait_time: waitTimeSeconds,
          queue_position: 321,
          eligible_workers: 3,
        }),
        { status: 200 }
      );
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return calls;
}

test.beforeEach(() => {
  aiHordeImageCatalog.replace([
    { name: "Deliberate", count: 3, queued: 0, eta: 1478, performance: 1, jobs: 0 },
  ]);
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("refuses after one poll when queue wait cannot fit the request budget", async () => {
  const calls = stubQueue(1478);
  const result = await handleAiHordeImageGeneration({
    model: "Deliberate",
    provider: "aihorde",
    body: { model: "aihorde/Deliberate", prompt: "hello" },
    credentials: { apiKey: "horde-key" },
    timeoutMs: 600_000,
  });

  assert.equal(result.success, false);
  assert.equal(result.status, 504);
  assert.match(String(result.error), /queue wait ~1478s/);
  assert.match(String(result.error), /position 321/);
  assert.match(String(result.error), /3 eligible worker/);
  assert.equal(calls.filter((call) => call.includes("/generate/check/")).length, 1);
});

test("keeps polling while the reported queue fits the budget", async () => {
  const calls = stubQueue(2);
  const result = await handleAiHordeImageGeneration({
    model: "Deliberate",
    provider: "aihorde",
    body: { model: "aihorde/Deliberate", prompt: "hello" },
    credentials: { apiKey: "horde-key" },
    timeoutMs: 3_200,
  });

  assert.equal(result.success, false);
  assert.equal(result.status, 504);
  assert.ok(calls.filter((call) => call.includes("/generate/check/")).length > 1);
});
