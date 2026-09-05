export interface CompressionAnalyticsRow {
  id?: string | number;
  timestamp: string;
  original_tokens?: string | number;
  compressed_tokens?: string | number;
  request_id?: string;
  compression_combo_id?: string | null;
  combo_id?: string | null;
  mode?: string;
  engine?: string;
  duration_ms?: number;
  validation_fallback?: number | boolean;
}
export function getLatestCompressionAnalyticsRun(): CompressionAnalyticsRow | null;
export function getCompressionAnalyticsSummary(since?: string): any;
