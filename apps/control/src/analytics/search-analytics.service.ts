import { Injectable } from "@nestjs/common";
import { getSearchAggregateStats, getSearchProviderCounts } from "@orbit/core/db/call-log-stats";
import { SEARCH_PROVIDERS } from "@orbit/inference/config/searchRegistry";

export interface SearchAnalyticsResponse {
  total: number;
  today: number;
  cached: number;
  errors: number;
  totalCostUsd: number;
  byProvider: Record<string, { count: number; costUsd: number }>;
  cacheHitRate: number;
  avgDurationMs: number;
  last24h: [];
}

/** Read-only search request aggregates for the control API. */
@Injectable()
export class SearchAnalyticsService {
  getSearchAnalytics(): SearchAnalyticsResponse {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const statsRow = getSearchAggregateStats(todayStart.toISOString());
    const total = Number(statsRow?.total ?? 0);
    const today = Number(statsRow?.today ?? 0);
    const errors = Number(statsRow?.errors ?? 0);
    const avgDurationMs = Math.round(Number(statsRow?.avg_duration ?? 0));
    const cached = Number(statsRow?.cached ?? 0);

    const byProvider: Record<string, { count: number; costUsd: number }> = {};
    let totalCostUsd = 0;
    for (const row of getSearchProviderCounts()) {
      const count = Number(row.cnt ?? 0);
      const costUsd = (SEARCH_PROVIDERS[row.provider]?.costPerQuery ?? 0) * count;
      byProvider[row.provider] = { count, costUsd };
      totalCostUsd += costUsd;
    }

    return {
      total,
      today,
      cached,
      errors,
      totalCostUsd,
      byProvider,
      cacheHitRate: total > 0 ? Math.round((cached / total) * 100) : 0,
      avgDurationMs,
      last24h: [],
    };
  }
}
