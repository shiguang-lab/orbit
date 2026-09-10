import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeProviderSpecificDataForResponse } from "@orbit/core/providers/request-defaults";
import { convertUsageToQuotaInfo } from "../src/services/genericQuotaFetcher.js";
import { __testing } from "../src/services/usage/volcenginePlan.js";

test("Volcengine coding and agent quota windows use canonical keys", () => {
  const coding = __testing.mapCodingPlanUsage({
    QuotaUsage: [
      { Level: "session", Cap: 0, Percent: 20 },
      { Level: "weekly", Cap: 100, Percent: 35 },
    ],
  });
  assert.equal(coding["session (5h)"].total, 100);
  assert.equal(coding["weekly (7d)"].remainingPercentage, 65);

  const agent = __testing.mapAgentPlanUsage({
    AFPFiveHour: { Quota: 100, Used: 30 },
    AFPWeekly: { Quota: 0, Used: 0 },
  });
  assert.equal(agent["session (5h)"].remainingPercentage, 70);
  assert.equal(agent["weekly (7d)"].remainingPercentage, 0);
});

test("generic quota normalization keeps time windows out of model fallback", () => {
  const info = convertUsageToQuotaInfo({
    quotas: {
      daily: { remainingPercentage: 5 },
      weekly: { remainingPercentage: 60 },
      session: { remainingPercentage: 80 },
    },
  });
  assert.equal(info?.window5h?.percentUsed, 0.2);
  assert.equal(info?.window7d?.percentUsed, 0.4);
});

test("Volcengine console credentials are stripped from API responses", () => {
  assert.deepEqual(
    sanitizeProviderSpecificDataForResponse({
      volcConsoleCookie: "secret-cookie",
      volcCsrfToken: "secret-csrf",
      volcPlanKind: "coding",
    }),
    { volcPlanKind: "coding" }
  );
});
