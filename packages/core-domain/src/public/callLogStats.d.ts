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
