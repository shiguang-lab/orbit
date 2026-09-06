import { Injectable } from "@nestjs/common";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { computeFreeProviderRankings } from "@shiguang-gateway/core-domain/control/free-provider-rankings";
import { getRadarCatalog } from "@shiguang-gateway/core-domain/control/radar";
import { sumUsageTokensThisMonth } from "@shiguang-gateway/core-domain/usage/summary";
import { listNoCredentialProviders } from "./provider-credential-requirement.js";
import {
  computeFreeModelTotals,
  type FreeModelBudget,
} from "@shiguang-gateway/open-sse/config/freeModelCatalog";
import {
  FREE_CATALOG_CURATED_AT,
  FREE_MODEL_BUDGETS,
} from "@shiguang-gateway/open-sse/config/freeModelCatalog.data";
import { freeProviderRankingsQuerySchema } from "./free-tier.schemas.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const HARD_STOP_BY_KEY = new Map(
  FREE_MODEL_BUDGETS.filter((model) => model.hardStopGuaranteed !== undefined).map((model) => [
    `${model.provider}:${model.modelId}`,
    model.hardStopGuaranteed,
  ]),
);

type RadarEntry = ReturnType<typeof getRadarCatalog>["entries"][number];

function toBudgetEntry(entry: RadarEntry): FreeModelBudget & { enabled?: boolean } {
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

function buildFreeTierSummary(options: {
  excludeTosAvoid: boolean;
  authenticated: boolean;
}): Record<string, unknown> {
  const { entries, meta } = getRadarCatalog();
  const serveOverlay = meta !== null && (meta.tier !== "live" || options.authenticated);
  const totals = serveOverlay
    ? computeFreeModelTotals({
        excludeTosAvoid: options.excludeTosAvoid,
        entries: entries.map(toBudgetEntry),
      })
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

@Injectable()
export class FreeTierService {
  options(): Response {
    return new Response(null, { status: 204, headers: CORS });
  }

  async rankings(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parsed = freeProviderRankingsQuerySchema.safeParse({
      category: url.searchParams.get("category") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      configuredOnly: url.searchParams.get("configuredOnly") || undefined,
      availableOnly: url.searchParams.get("availableOnly") || undefined,
      withUsage: url.searchParams.get("withUsage") || undefined,
      usageRange: url.searchParams.get("usageRange") || undefined,
    });
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { category, limit, configuredOnly, availableOnly, withUsage, usageRange } = parsed.data;
    const rankings = await computeFreeProviderRankings(category, limit, {
      configuredOnly,
      availableOnly,
      withUsage,
      usageRange,
    });
    return Response.json({ rankings }, { headers: CORS_HEADERS });
  }

  summary(request: Request, authenticated: boolean): Response {
    const excludeTosAvoid = new URL(request.url).searchParams.get("excludeTosAvoid") === "1";
    return Response.json(buildFreeTierSummary({ excludeTosAvoid, authenticated }), { headers: CORS });
  }
}
