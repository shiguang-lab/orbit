/**
 * Regression tests for upstream sync — flat-rate cost estimates (#11460 / afb91a83b).
 *
 * Contract under test:
 * - The unified SQL source exposes stored_cost / is_aggregated so analytics can
 *   distinguish archived rollup rows from raw per-request rows.
 * - Cost queries keep cost inputs separated by day (GROUP BY DATE(timestamp) first).
 * - The usage_history rollup REPLACES prior summaries (idempotent, no additive
 *   double-counting) and prices each request token-shape individually.
 * - Billed-cost surfaces keep $0 for flat-rate providers; dashboards opt in via
 *   includeFlatRateEstimates=true and the response flags estimate mode.
 *
 * SQL-layer behaviour is verified through the pure source-string builders;
 * handler/console wiring is verified as source contracts (same pattern as
 * upstream tests/integration/integration-wiring.test.ts).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPresetUnifiedSource, buildUnifiedSource } from "../src/lib/db/usageAnalytics/sources.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");

function readProjectFile(relative: string): string {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8");
}

const BASE_OPTS = {
  sinceIso: null as string | null,
  untilIso: null as string | null,
  rawCutoffDate: "2026-09-01",
  apiKeyWhere: "",
  apiKeyParams: {},
};

// ── unified source exposes stored_cost / is_aggregated ──────────────────────

test("buildUnifiedSource merged legs carry stored_cost and is_aggregated markers", () => {
  const { unifiedSource } = buildUnifiedSource(BASE_OPTS);
  // Aggregated leg marks archive rows and preserves the stored API-equivalent cost.
  assert.match(unifiedSource, /COALESCE\(total_cost, 0\.0\) as stored_cost/);
  assert.match(unifiedSource, /1 as is_aggregated/);
  // Raw leg marks live rows with zero stored cost.
  assert.match(unifiedSource, /0\.0 as stored_cost,\s*0 as is_aggregated/);
});

test("buildUnifiedSource raw-only window still exposes the marker columns", () => {
  const { unifiedSource } = buildUnifiedSource({ ...BASE_OPTS, sinceIso: "2026-09-05T00:00:00.000Z" });
  assert.match(unifiedSource, /0\.0 as stored_cost,\s*0 as is_aggregated/);
  assert.doesNotMatch(unifiedSource, /daily_usage_summary/);
});

test("buildPresetUnifiedSource exposes the marker columns on both legs", () => {
  const { unifiedSource } = buildPresetUnifiedSource(BASE_OPTS);
  assert.match(unifiedSource, /COALESCE\(total_cost, 0\.0\) as stored_cost/);
  assert.match(unifiedSource, /1 as is_aggregated/);
  assert.match(unifiedSource, /0\.0 as stored_cost,\s*0 as is_aggregated/);
});

// ── cost queries keep cost inputs separated by day ──────────────────────────

test("usageAnalytics cost queries group by DATE(timestamp) before provider/model", () => {
  const source = readProjectFile("packages/core/src/lib/db/usageAnalytics.ts");
  for (const [name, groupBy] of [
    ["getDailyCostRows", "GROUP BY DATE(timestamp), LOWER(provider), LOWER(model), serviceTier"],
    ["getModelUsageRows", "GROUP BY DATE(timestamp), LOWER(model), LOWER(provider), serviceTier"],
    ["getProviderCostRows", "GROUP BY DATE(timestamp), LOWER(provider), LOWER(model), serviceTier"],
    ["getAccountCostRows", "GROUP BY DATE(account_events.timestamp), accountKey"],
    ["getApiKeyUsageRows", "GROUP BY DATE(timestamp), COALESCE(NULLIF(api_key_id, '')"],
    ["getServiceTierUsageRows", "GROUP BY DATE(timestamp), serviceTier, LOWER(provider), LOWER(model)"],
    ["getPresetCostModelRows", "GROUP BY DATE(timestamp), LOWER(model), LOWER(provider), serviceTier"],
  ] as const) {
    assert.match(
      source,
      new RegExp(`${groupBy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `${name} must keep cost inputs separated by day`
    );
  }
  // Cost row types surface the archive columns.
  const storedCostFieldCount = source.match(/storedCost: number;/g)?.length ?? 0;
  assert.ok(storedCostFieldCount >= 5, "DailyCost/ModelUsage/ProviderCost/ServiceTier/PresetCost rows expose storedCost");
});

// ── rollup semantics: replace, not accumulate ───────────────────────────────

test("rollupUsageHistoryBeforeDate replaces prior summaries and prices request shapes", () => {
  const source = readProjectFile("packages/core/src/lib/usage/aggregateHistory.ts");
  // No additive ON CONFLICT — retries must stay idempotent instead of double-counting.
  assert.doesNotMatch(source, /daily_usage_summary\.total_requests \+ excluded\.total_requests/);
  assert.match(source, /total_requests = excluded\.total_requests/);
  // Prices one request of each token shape, multiplied by the group size.
  assert.match(source, /flatRateAsZero: false/);
  assert.match(source, /\* row\.totalRequests/);
  assert.match(source, /db\.transaction\(/);
});

// ── billed-cost semantics preserved on legacy stats surface ─────────────────

test("usageStats masks stored cost for flat-rate providers", () => {
  const source = readProjectFile("packages/core/src/lib/usage/usageStats.ts");
  assert.match(source, /isFlatRateProvider\(provider\) \? 0 : storedCost/);
});

// ── analytics route opt-in contract ─────────────────────────────────────────

test("analytics handler threads includeFlatRateEstimates and flags the response", () => {
  const source = readProjectFile("apps/control/src/usage/handlers/analytics.handler.ts");
  assert.match(source, /searchParams\.get\("includeFlatRateEstimates"\) === "true"/);
  assert.match(source, /includesFlatRateEstimates: includeFlatRateEstimates/);
  // Every external call site passes the flag; the two function definitions and
  // the single internal pass-through (which forwards flatRateAsZero) do not.
  const callSites = source.match(/computeUsageRow(?:Standard)?Cost\(/g)?.length ?? 0;
  const threaded = source.match(/!includeFlatRateEstimates/g)?.length ?? 0;
  assert.ok(
    threaded >= callSites - 3,
    `expected every external call site threaded with !includeFlatRateEstimates (calls=${callSites}, threaded=${threaded})`
  );
  // Aggregated rows honour the stored cost, flat-rate masked unless opted in.
  assert.match(source, /if \(flatRateAsZero && isFlatRateProvider\(provider\)\) return 0;/);
  assert.match(source, /if \(storedCost > 0\) return storedCost;/);
  // Standard-tier comparison must not inherit archived cost fields.
  assert.match(source, /storedCost: 0,\n\s+stored_cost: 0,\n\s+isAggregated: 0/);
});

// ── console dashboards opt in and label estimates ───────────────────────────

test("console cost dashboard opts into estimates and labels them", () => {
  const api = readProjectFile("apps/console/src/entities/api.ts");
  assert.match(api, /includesFlatRateEstimates\?: boolean;/);
  assert.match(api, /q\.set\("includeFlatRateEstimates", params\.includeFlatRateEstimates\)/);

  const page = readProjectFile("apps/console/src/features/analytics/analytics.tsx");
  assert.match(page, /includeFlatRateEstimates: "true"/);
  assert.match(page, /includesFlatRateEstimates === true/);
  // Strict flag check keeps omitted/false/malformed on billed-cost wording.
  assert.doesNotMatch(page, /includesFlatRateEstimates === false/);
});
