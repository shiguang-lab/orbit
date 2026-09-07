export interface CleanupResult {
  deleted: number;
  errors: number;
  deletedArtifacts?: number;
}
export const RESET_USAGE_HISTORY_PERIODS: readonly ["5m", "1h", "3h", "6h", "12h", "1d", "7d", "30d", "all"];
export type ResetUsageHistoryPeriod = (typeof RESET_USAGE_HISTORY_PERIODS)[number];
export interface ResetUsageHistoryResult extends CleanupResult {
  deletedUsageHistory: number;
  deletedDailySummary: number;
  deletedHourlySummary: number;
  deletedCallLogs: number;
  deletedCallLogArtifacts: number;
  deletedRequestDetailLogs: number;
  deletedProxyLogs: number;
  deletedRelayLogs: number;
  deletedCompressionAnalytics: number;
  deletedCompressionRunTelemetry: number;
  deletedRoutingDecisions: number;
  deletedQuotaConsumption: number;
  deletedTokenLedger: number;
}
export function purgeQuotaSnapshots(): Promise<CleanupResult>;
export function purgeCallLogs(): Promise<CleanupResult>;
export function purgeDetailedLogs(): Promise<CleanupResult>;
export function resetUsageHistory(period: string): Promise<ResetUsageHistoryResult>;
