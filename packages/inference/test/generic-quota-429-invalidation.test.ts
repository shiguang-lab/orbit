import assert from "node:assert/strict";
import test from "node:test";
import {
  __resetGenericQuotaFetcherForTests,
  __setGenericUsageFetcherForTests,
  fetchGenericQuota,
  invalidateGenericQuotaCacheOnStatus,
} from "../src/services/genericQuotaFetcher.js";

const connection = { id: "conn-1", provider: "antigravity", accessToken: "token" };

function usage(remainingPercentage: number) {
  return {
    quotas: {
      "gemini-3-flash": {
        remainingPercentage,
        fractionReported: true,
        resetAt: "2026-09-11T00:00:00Z",
      },
    },
  };
}

test.beforeEach(() => __resetGenericQuotaFetcherForTests());
test.afterEach(() => {
  __setGenericUsageFetcherForTests(null);
  __resetGenericQuotaFetcherForTests();
});

test("upstream 429 drops wrapper cache and force-refreshes the next usage request", async () => {
  const options: Array<{ forceRefresh?: boolean } | undefined> = [];
  let remaining = 80;
  __setGenericUsageFetcherForTests(async (_connection, requestOptions) => {
    options.push(requestOptions);
    return usage(remaining);
  });

  assert.equal((await fetchGenericQuota("conn-1", connection as never))?.percentUsed, 0.2);
  remaining = 20;
  assert.equal((await fetchGenericQuota("conn-1", connection as never))?.percentUsed, 0.2);
  assert.equal(
    invalidateGenericQuotaCacheOnStatus({
      provider: "antigravity",
      connectionId: "conn-1",
      status: 429,
    }),
    true
  );
  assert.equal((await fetchGenericQuota("conn-1", connection as never))?.percentUsed, 0.8);
  assert.deepEqual(options, [{}, { forceRefresh: true }]);
});

test("probe-origin and non-429 responses do not invalidate routing quota state", async () => {
  let calls = 0;
  __setGenericUsageFetcherForTests(async () => {
    calls += 1;
    return usage(50);
  });
  await fetchGenericQuota("conn-1", connection as never);
  assert.equal(
    invalidateGenericQuotaCacheOnStatus({
      provider: "antigravity",
      connectionId: "conn-1",
      status: 429,
      isolateProbe: true,
    }),
    false
  );
  assert.equal(
    invalidateGenericQuotaCacheOnStatus({
      provider: "antigravity",
      connectionId: "conn-1",
      status: 503,
    }),
    false
  );
  await fetchGenericQuota("conn-1", connection as never);
  assert.equal(calls, 1);
});
