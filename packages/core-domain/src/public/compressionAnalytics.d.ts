export interface CompressionAnalyticsRow {
  id?: string | number;
  timestamp: string;
  original_tokens: number;
  compressed_tokens: number;
  tokens_saved: number;
  request_id?: string;
  compression_combo_id?: string | null;
  combo_id?: string | null;
  mode?: string;
  engine?: string;
  provider?: string | null;
  duration_ms?: number;
  validation_fallback?: number | boolean;
  actual_prompt_tokens?: number | null;
  actual_completion_tokens?: number | null;
  actual_total_tokens?: number | null;
  actual_cache_read_tokens?: number | null;
  actual_cache_write_tokens?: number | null;
  estimated_usd_saved?: number | null;
  mcp_description_tokens_saved?: number | null;
  multimodal_skip_count?: number | null;
  receipt_source?: string | null;
  output_mode?: string | null;
  rtk_raw_output_pointer?: string | null;
  rtk_raw_output_bytes?: number | null;
  rtk_raw_output_pointers?: string | null;
  rtk_raw_output_total_bytes?: number | null;
  skip_reason?: string | null;
}
export interface CompressionEngineBreakdownRow {
  timestamp: string;
  request_id?: string | null;
  engine: string;
  original_tokens: number;
  compressed_tokens: number;
  tokens_saved: number;
  duration_ms?: number | null;
}
export interface CompressionAnalyticsSummary {
  totalRequests: number;
  totalTokensSaved: number;
  avgSavingsPct: number;
  avgDurationMs: number;
  byMode: Record<
    string,
    { count: number; tokensSaved: number; avgSavingsPct: number; skipped: number }
  >;
  byEngine: Record<string, { count: number; tokensSaved: number; avgSavingsPct: number }>;
  byCompressionCombo: Record<string, { count: number; tokensSaved: number }>;
  byProvider: Record<string, { count: number; tokensSaved: number }>;
  last24h: Array<{ hour: string; count: number; tokensSaved: number }>;
  totalSkipped: number;
  bySkipReason: Record<string, number>;
  validationFallbacks: number;
  realUsage: {
    requestsWithReceipts: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estimatedUsdSaved: number;
    bySource: Record<string, number>;
  };
  mcpDescriptionCompression: {
    snapshots: number;
    estimatedTokensSaved: number;
  };
}
export function getLatestCompressionAnalyticsRun(): CompressionAnalyticsRow | null;
export function getCompressionAnalyticsSummary(since?: string): CompressionAnalyticsSummary;
export function getPerEngineAnalytics(engineId: string, days?: number): any;
export function insertCompressionAnalyticsRow(row: CompressionAnalyticsRow): void;
export function insertCompressionEngineBreakdown(rows: CompressionEngineBreakdownRow[]): void;
export function attachCompressionUsageReceipt(
  requestId: string | null | undefined,
  usage: Record<string, unknown> | null | undefined,
  source?: "provider" | "estimated" | "stream",
): void;
export function recordContextEditingTelemetry(
  requestId: string | null | undefined,
  telemetry?: {
    clearedInputTokens?: number;
    clearedToolUses?: number;
    editCount?: number;
  } | null,
  provider?: string | null,
): void;
