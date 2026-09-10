import assert from "node:assert/strict";
import test from "node:test";

import { getMoonshotUsage } from "../src/services/usage/moonshot.ts";
// Self-contained dashboard parser (no imports of its own) — the consumer side
// of the moonshot balance contract.
const { parseQuotaData } = await import(
  "../../../apps/console/src/features/quota/quotaParsing.ts"
);

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CONNECTION = {
  id: "ms-conn-1",
  provider: "moonshot",
  apiKey: "sk-test",
  providerSpecificData: { baseUrl: "https://api.moonshot.cn" },
};

/**
 * #12733: Moonshot Open Platform returns an absolute CNY balance. An empty
 * account must render as 0% leftover / ¥0.00 — not an unlimited row, not a
 * fabricated 100% bar.
 */
test("empty moonshot balance yields 0% leftover, unlimited=false, CNY", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      code: 0,
      data: { available_balance: 0, voucher_balance: 0, cash_balance: 0 },
      status: true,
    });

  const usage = (await getMoonshotUsage(CONNECTION)) as {
    quotas: Record<string, Record<string, unknown>>;
  };
  const balance = usage.quotas?.balance;
  assert.ok(balance, "the balance bucket must exist");
  assert.equal(balance.remainingPercentage, 0);
  assert.equal(balance.unlimited, false);
  assert.equal(balance.currency, "CNY");
});

test("dashboard renders the moonshot balance as a credits row", async () => {
  globalThis.fetch = async () =>
    jsonResponse({ code: 0, data: { available_balance: 12.5 }, status: true });

  const usage = await getMoonshotUsage(CONNECTION);
  const rows = parseQuotaData("moonshot", usage) as Array<{
    name?: string;
    isCredits?: boolean;
    remainingPercentage?: number;
    creditCount?: number;
    currency?: string;
  }>;

  const balance = rows.find((row) => row.name === "balance");
  assert.ok(balance, "the balance row must survive parsing");
  assert.equal(balance.isCredits, true, "an absolute balance must render as credits (¥), not %");
  assert.equal(balance.creditCount, 12.5);
  assert.equal(balance.currency, "CNY");
});

test("empty balance parses to a 0% credits row, not a fake bar", () => {
  const rows = parseQuotaData("moonshot", {
    quotas: {
      balance: {
        remaining: 0,
        remainingPercentage: 0,
        resetAt: null,
        unlimited: false,
        currency: "CNY",
        displayName: "Available Balance",
      },
    },
  }) as Array<{ name?: string; isCredits?: boolean; remainingPercentage?: number }>;

  const balance = rows.find((row) => row.name === "balance");
  assert.ok(balance);
  assert.equal(balance.isCredits, true);
  assert.equal(balance.remainingPercentage, 0);
});
