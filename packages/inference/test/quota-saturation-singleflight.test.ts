import assert from "node:assert/strict";
import test from "node:test";
import {
  __setGenericUsageFetcherForTests,
  _clearSaturationCache,
  getSaturation,
} from "../src/services/quotaSaturation.js";

const dimension = { unit: "tokens", window: "hourly" } as const;

test.beforeEach(() => {
  _clearSaturationCache();
  __setGenericUsageFetcherForTests(null);
});

test.afterEach(() => {
  __setGenericUsageFetcherForTests(null);
});

test("shares one upstream saturation fetch across concurrent same-key misses", async () => {
  let calls = 0;
  __setGenericUsageFetcherForTests(async () => {
    calls += 1;
    await Promise.resolve();
    return { percentUsed: 0.42 };
  });

  const values = await Promise.all([
    getSaturation("connection", "singleflight-provider", dimension),
    getSaturation("connection", "singleflight-provider", dimension),
    getSaturation("connection", "singleflight-provider", dimension),
  ]);

  assert.deepEqual(values, [0.42, 0.42, 0.42]);
  assert.equal(calls, 1);
});

test("cleans rejected in-flight fetches while preserving fail-open caching", async () => {
  let calls = 0;
  __setGenericUsageFetcherForTests(async () => {
    calls += 1;
    throw new Error("upstream unavailable");
  });

  assert.deepEqual(
    await Promise.all([
      getSaturation("connection", "rejecting-provider", dimension),
      getSaturation("connection", "rejecting-provider", dimension),
    ]),
    [0, 0],
  );
  assert.equal(calls, 1);

  assert.equal(await getSaturation("connection", "rejecting-provider", dimension), 0);
  assert.equal(calls, 1);

  _clearSaturationCache();
  assert.equal(await getSaturation("connection", "rejecting-provider", dimension), 0);
  assert.equal(calls, 2);
});
