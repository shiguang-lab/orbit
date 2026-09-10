import assert from "node:assert/strict";
import test from "node:test";

import {
  __resetGenericQuotaFetcherForTests,
  __setGenericUsageFetcherForTests,
  convertUsageToQuotaInfo,
  fetchGenericQuota,
} from "../src/services/genericQuotaFetcher.ts";
import { quotaRemainingPercentFromQuota } from "../src/services/combo/comboPredicates.ts";
import {
  evaluateQuotaCutoff,
  preflightQuota,
  registerQuotaFetcher,
} from "../src/services/quotaPreflight.ts";

const mixedUsage = {
  quotas: {
    "gemini-3-flash": { remainingPercentage: 80, resetAt: "gemini-5h" },
    "claude-sonnet-4-5": { remainingPercentage: 90, resetAt: "claude-5h" },
    gemini_weekly: { remainingPercentage: 70, resetAt: "gemini-7d" },
    claude_gpt_weekly: { remainingPercentage: 0, resetAt: "claude-7d" },
  },
};

test.afterEach(() => {
  __setGenericUsageFetcherForTests(null);
  __resetGenericQuotaFetcherForTests();
});

test("Antigravity quota conversion only evaluates the requested model family", () => {
  const gemini = convertUsageToQuotaInfo(mixedUsage, {
    provider: "antigravity",
    requestedModel: "gemini-3-flash",
  });
  const claude = convertUsageToQuotaInfo(mixedUsage, {
    provider: "antigravity",
    requestedModel: "claude-sonnet-4-5",
  });

  assert.equal(gemini?.percentUsed, 0.3);
  assert.equal(gemini?.limitReached, false);
  assert.deepEqual(Object.keys(gemini?.windows ?? {}).sort(), ["gemini-3-flash", "gemini_weekly"]);
  assert.equal(claude?.percentUsed, 1);
  assert.equal(claude?.limitReached, true);
  assert.deepEqual(Object.keys(claude?.windows ?? {}).sort(), [
    "claude-sonnet-4-5",
    "claude_gpt_weekly",
  ]);
});

test("Antigravity quota cache is isolated by requested family", async () => {
  let calls = 0;
  __setGenericUsageFetcherForTests(async () => {
    calls += 1;
    return mixedUsage;
  });

  const base = { id: "agy-1", provider: "antigravity", accessToken: "token" };
  const gemini = await fetchGenericQuota("agy-1", {
    ...base,
    requestedModel: "gemini-3-flash",
  });
  const claude = await fetchGenericQuota("agy-1", {
    ...base,
    requestedModel: "claude-sonnet-4-5",
  });
  const geminiCached = await fetchGenericQuota("agy-1", {
    ...base,
    requestedModel: "gemini-3-pro",
  });

  assert.equal(gemini?.limitReached, false);
  assert.equal(claude?.limitReached, true);
  assert.equal(geminiCached?.limitReached, false);
  assert.equal(calls, 2);
});

test("mixed Antigravity windows do not let exhausted Claude quota block Gemini", () => {
  const quota = {
    used: 1,
    total: 1,
    percentUsed: 1,
    limitReached: true,
    windows: {
      "gemini-3-flash": { percentUsed: 0.2, resetAt: "gemini-5h" },
      gemini_weekly: { percentUsed: 0.3, resetAt: "gemini-7d" },
      "claude-sonnet-4-5": { percentUsed: 0.9, resetAt: "claude-5h" },
      claude_gpt_weekly: { percentUsed: 1, resetAt: "claude-7d" },
    },
  };

  assert.equal(
    quotaRemainingPercentFromQuota(quota, {
      provider: "antigravity",
      requestedModel: "gemini-3-flash",
    }),
    70
  );
  assert.deepEqual(
    evaluateQuotaCutoff(quota, undefined, {
      provider: "antigravity",
      requestedModel: "gemini-3-flash",
    }),
    { proceed: true, quotaPercent: 1 }
  );
  assert.equal(
    evaluateQuotaCutoff(quota, undefined, {
      provider: "antigravity",
      requestedModel: "claude-sonnet-4-5",
    }).proceed,
    false
  );
});

test("Antigravity preflight scopes aggregate limitReached to the requested family", async () => {
  registerQuotaFetcher("agy", async () => ({
    used: 1,
    total: 1,
    percentUsed: 1,
    limitReached: true,
    windows: {
      gemini_weekly: { percentUsed: 0.3, resetAt: "gemini-reset" },
      claude_gpt_weekly: { percentUsed: 1, resetAt: "claude-reset" },
    },
  }));

  const gemini = await preflightQuota("agy", "agy-1", {
    requestedModel: "gemini-3-flash",
  });
  const claude = await preflightQuota("agy", "agy-1", {
    requestedModel: "claude-sonnet-4-5",
  });
  assert.equal(gemini.proceed, true);
  assert.equal(claude.proceed, false);
  assert.equal(claude.windowName, "claude_gpt_weekly");
});
