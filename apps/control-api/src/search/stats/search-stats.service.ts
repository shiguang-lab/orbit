import { Injectable } from "@nestjs/common";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  getRecentSearchLogs,
  getSearchProviderStats,
} from "@shiguang-gateway/core-domain/db/call-log-stats";
import { SEARCH_PROVIDERS } from "@shiguang-gateway/open-sse/config/searchRegistry";
import { getCacheStats } from "@shiguang-gateway/open-sse/services/searchCache";

@Injectable()
export class SearchStatsService {
  async get(request: Request): Promise<Response> {
    if (!(await isAuthenticated(request))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const providers: Record<
        string,
        { requests: number; avg_latency_ms: number; total_cost: number }
      > = {};
      for (const row of getSearchProviderStats()) {
        const costPerQuery = SEARCH_PROVIDERS[row.provider]?.costPerQuery ?? 0;
        providers[row.provider] = {
          requests: row.requests,
          avg_latency_ms: row.avg_latency_ms,
          total_cost: Number.parseFloat((row.requests * costPerQuery).toFixed(4)),
        };
      }

      const recent_searches = getRecentSearchLogs().map((row) => {
        let query = "";
        let filters: unknown = {};
        try {
          const summary = JSON.parse(row.request_summary ?? "") as {
            query?: string;
            filters?: unknown;
          };
          query = summary.query ?? "";
          filters = summary.filters ?? {};
        } catch {
          // Preserve an empty summary when an older log row is malformed.
        }
        return { query, provider: row.provider, timestamp: row.timestamp, filters };
      });

      return Response.json({ cache: getCacheStats(), providers, recent_searches });
    } catch {
      return Response.json({ error: "Failed to get stats" }, { status: 500 });
    }
  }
}
