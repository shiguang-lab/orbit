import assert from "node:assert/strict";
import test from "node:test";
import { rateLimitedProviderResponse } from "../src/common/provider-rate-limit-response.ts";

test("rateLimitedProviderResponse preserves rate-limit metadata", async () => {
  const response = rateLimitedProviderResponse("example", {
    allRateLimited: true,
    retryAfter: 12,
    retryAfterHuman: "12 seconds",
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "12");
  const body = await response.json();
  assert.equal(body.error.message, "[example] All accounts rate limited (12 seconds)");
});
