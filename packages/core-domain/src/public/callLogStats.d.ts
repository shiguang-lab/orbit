export interface ProviderMetricRow {
  provider?: string;
  totalRequests?: number | string;
  totalSuccesses?: number | string;
  avgLatencyMs?: number | string;
  lastRequestAt?: string | null;
  lastErrorAt?: string | null;
  lastStatus?: number | string | null;
  lastErrorStatus?: number | string | null;
}
export function getProviderMetrics(): ProviderMetricRow[];

export interface SearchAggregateStats {
  total: number;
  today: number;
  errors: number;
  avg_duration: number | null;
  cached: number;
}
export interface SearchProviderCountRow {
  provider: string;
  cnt: number;
}
export function getSearchAggregateStats(todayIso: string): SearchAggregateStats;
export function getSearchProviderCounts(): SearchProviderCountRow[];
