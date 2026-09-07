import assert from "node:assert/strict";
import { test } from "node:test";

import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";

test("recognizes only objects carrying the literal allRateLimited sentinel", () => {
  const cases: Array<{ value: unknown; expected: boolean }> = [
    { value: null, expected: false },
    { value: undefined, expected: false },
    { value: false, expected: false },
    { value: "true", expected: false },
    { value: 1, expected: false },
    { value: [], expected: false },
    { value: {}, expected: false },
    { value: { allRateLimited: false }, expected: false },
    { value: { allRateLimited: "true" }, expected: false },
    { value: { allRateLimited: true }, expected: true },
    {
      value: {
        allRateLimited: true,
        retryAfter: "2026-09-06T00:00:00.000Z",
        retryAfterHuman: "in 30 seconds",
        lastError: "quota exhausted",
        lastErrorCode: 429,
        cooldownScope: "model",
        cooldownModel: "example-model",
        connectionsCount: 2,
      },
      expected: true,
    },
  ];

  for (const { value, expected } of cases) {
    assert.equal(isAllRateLimitedCredentials(value), expected);
  }
});
