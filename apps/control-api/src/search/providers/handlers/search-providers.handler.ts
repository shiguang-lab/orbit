import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { getProviderCredentials } from "@shiguang-gateway/open-sse/services/auth";
import { isAllRateLimitedCredentials } from "@shiguang-gateway/open-sse/services/credential-selection";
import { SEARCH_PROVIDERS, getSearchCredentialFallbacks } from "@shiguang-gateway/open-sse/config/searchRegistry";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { log } from "@shiguang-gateway/open-sse/utils/logger";
import {
  SearchProviderCatalogResponseSchema,
  type SearchProviderCatalogItem,
} from "../search-providers.schemas.js";

interface FetchProviderDef {
  id: string;
  name: string;
  costPerQuery: number;
  freeMonthlyQuota: number;
  fetchFormats: string[];
}

const FETCH_PROVIDERS: FetchProviderDef[] = [
  { id: "firecrawl", name: "Firecrawl", costPerQuery: 0.002, freeMonthlyQuota: 1000, fetchFormats: ["markdown", "html", "links", "screenshot"] },
  { id: "jina-reader", name: "Jina Reader (r.jina.ai)", costPerQuery: 0.0005, freeMonthlyQuota: 1000, fetchFormats: ["markdown", "text"] },
  { id: "tavily-search", name: "Tavily Extract", costPerQuery: 0.001, freeMonthlyQuota: 1000, fetchFormats: ["markdown", "text"] },
  { id: "tinyfish", name: "TinyFish Fetch", costPerQuery: 0, freeMonthlyQuota: 0, fetchFormats: ["markdown", "html"] },
  { id: "nimble-search", name: "Nimble Extract", costPerQuery: 0.005, freeMonthlyQuota: 0, fetchFormats: ["markdown", "html", "links", "screenshot"] },
  { id: "anysearch-search", name: "AnySearch", costPerQuery: 0, freeMonthlyQuota: 0, fetchFormats: ["markdown"] },
];

type ProviderStatus = "configured" | "missing" | "rate_limited";

async function resolveProviderStatus(providerId: string, useCredentialFallback = true): Promise<ProviderStatus> {
  try {
    const credentials = await getProviderCredentials(providerId).catch(() => null);
    if (credentials && !isAllRateLimitedCredentials(credentials)) return "configured";

    if (isAllRateLimitedCredentials(credentials)) {
      if (useCredentialFallback) {
        for (const fallbackId of getSearchCredentialFallbacks(providerId)) {
          const fallbackCredentials = await getProviderCredentials(fallbackId).catch(() => null);
          if (fallbackCredentials && !isAllRateLimitedCredentials(fallbackCredentials)) return "configured";
        }
      }
      return "rate_limited";
    }

    if (useCredentialFallback) {
      let fallbackRateLimited = false;
      for (const fallbackId of getSearchCredentialFallbacks(providerId)) {
        const fallbackCredentials = await getProviderCredentials(fallbackId).catch(() => null);
        if (fallbackCredentials && !isAllRateLimitedCredentials(fallbackCredentials)) return "configured";
        if (isAllRateLimitedCredentials(fallbackCredentials)) fallbackRateLimited = true;
      }
      if (fallbackRateLimited) return "rate_limited";
    }
    return "missing";
  } catch {
    return "missing";
  }
}

function errorResponse(status: number, message: string): Response {
  return Response.json(buildErrorBody(status, message), { status });
}

export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) return errorResponse(401, "Unauthorized");

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const searchProviderStatuses = await Promise.all(
      Object.values(SEARCH_PROVIDERS).map(async (provider) => ({
        provider,
        status: await resolveProviderStatus(provider.id),
      })),
    );
    const searchItems: SearchProviderCatalogItem[] = searchProviderStatuses.map(({ provider, status }) => ({
      id: provider.id,
      name: provider.name,
      kind: "search",
      costPerQuery: provider.costPerQuery,
      freeMonthlyQuota: provider.freeMonthlyQuota,
      searchTypes: provider.searchTypes,
      status,
      configureHref: "/dashboard/providers",
    }));

    const fetchProviderStatuses = await Promise.all(
      FETCH_PROVIDERS.map(async (provider) => ({
        provider,
        status: await resolveProviderStatus(provider.id, false),
      })),
    );
    const fetchItems: SearchProviderCatalogItem[] = fetchProviderStatuses.map(({ provider, status }) => ({
      id: provider.id,
      name: provider.name,
      kind: "fetch",
      costPerQuery: provider.costPerQuery,
      freeMonthlyQuota: provider.freeMonthlyQuota,
      fetchFormats: provider.fetchFormats,
      status,
      configureHref: "/dashboard/providers",
    }));

    const providers = [...searchItems, ...fetchItems];
    const parseResult = SearchProviderCatalogResponseSchema.safeParse({ providers });
    if (!parseResult.success) log.warn("SEARCH_PROVIDERS", `Response schema validation warning: ${parseResult.error.message}`);

    const data = providers.map((provider) => ({
      id: provider.id,
      object: "search_provider",
      created: timestamp,
      name: provider.name,
      search_types: provider.searchTypes ?? [],
    }));
    return Response.json({ providers, data });
  } catch (error) {
    log.error("SEARCH_PROVIDERS", "Failed to list providers", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(500, "Failed to list providers");
  }
}
