import {
  computeFreeModelTotals,
  type FreeModelBudget,
} from "../../../open-sse/config/freeModelCatalog.ts";
import {
  FREE_CATALOG_CURATED_AT,
  FREE_MODEL_BUDGETS,
} from "../../../open-sse/config/freeModelCatalog.data.ts";
import type { MergedEntry } from "../lib/radar/applyFeed.ts";
import { getRadarCatalog } from "../lib/radar/index.ts";
import { sumUsageTokensThisMonth } from "../lib/db/usageSummary.ts";
import { listNoCredentialProviders } from "../shared/utils/providerCredentialRequirement.ts";

const HARD_STOP_BY_KEY = new Map(
  FREE_MODEL_BUDGETS.filter((model) => model.hardStopGuaranteed !== undefined).map((model) => [
    `${model.provider}:${model.modelId}`,
    model.hardStopGuaranteed,
  ]),
);

function toBudgetEntry(entry: MergedEntry): FreeModelBudget & { enabled?: boolean } {
  return {
    provider: entry.provider,
    modelId: entry.modelId,
    displayName: entry.displayName,
    monthlyTokens: entry.monthlyTokens,
    creditTokens: entry.creditTokens,
    freeType: entry.freeType,
    poolKey: entry.poolKey,
    tos: entry.tos,
    trainsOnPrompts: entry.trainsOnPrompts,
    hardStopGuaranteed: HARD_STOP_BY_KEY.get(`${entry.provider}:${entry.modelId}`),
    enabled: entry.enabled,
  };
}

/** Compute the free-tier dashboard projection without coupling it to an HTTP request. */
export function buildFreeTierSummary(options: {
  excludeTosAvoid: boolean;
  authenticated: boolean;
}): Record<string, unknown> {
  const { entries, meta } = getRadarCatalog();
  const serveOverlay = meta !== null && (meta.tier !== "live" || options.authenticated);
  const totals = serveOverlay
    ? computeFreeModelTotals({ excludeTosAvoid: options.excludeTosAvoid, entries: entries.map(toBudgetEntry) })
    : computeFreeModelTotals({ excludeTosAvoid: options.excludeTosAvoid });
  const usedThisMonth = sumUsageTokensThisMonth();

  return {
    ...totals,
    usedThisMonth,
    remaining: Math.max(0, totals.steadyRecurringTokens - usedThisMonth),
    catalogUpdatedAt: serveOverlay ? meta.generatedAt : FREE_CATALOG_CURATED_AT,
    catalogSource: serveOverlay ? "radar-overlay" : "baseline",
    noCredentialProviders: listNoCredentialProviders(),
  };
}
