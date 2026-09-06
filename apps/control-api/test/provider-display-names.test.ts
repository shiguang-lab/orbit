import assert from "node:assert/strict";
import test from "node:test";

import { buildByProviderRowsFromDisplayNames } from "../src/usage/provider-display-names.ts";

test("provider analytics projection uses configured names and normalizes metrics", () => {
  const rows = buildByProviderRowsFromDisplayNames([
    {
      provider: "custom-node",
      requests: "4",
      successfulRequests: "3",
      promptTokens: "10",
      completionTokens: "5",
      totalTokens: "15",
      avgLatencyMs: 12.6,
    },
  ], new Map([["custom-node", 1.23456789]]), new Map([["custom-node", "Team Gateway"]]));

  assert.deepEqual(rows, [{
    provider: "Team Gateway",
    requests: 4,
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15,
    avgLatencyMs: 13,
    successRatePct: "75.00",
    cost: 1.234568,
  }]);
});

test("provider analytics projection preserves unknown provider ids", () => {
  const [row] = buildByProviderRowsFromDisplayNames([
    {
      provider: "unregistered-provider",
      requests: 0,
      successfulRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      avgLatencyMs: 0,
    },
  ], new Map(), new Map());

  assert.equal(row.provider, "unregistered-provider");
  assert.equal(row.successRatePct, 0);
  assert.equal(row.cost, 0);
});
