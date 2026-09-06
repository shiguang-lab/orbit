export interface CleanupResult {
  deleted: number;
  errors: number;
  deletedArtifacts?: number;
}
export const RESET_USAGE_HISTORY_PERIODS: readonly ["today", "7d", "30d", "all"];
export type ResetUsageHistoryPeriod = (typeof RESET_USAGE_HISTORY_PERIODS)[number];
export interface ResetUsageHistoryResult extends CleanupResult {
  period: ResetUsageHistoryPeriod;
}
export function purgeQuotaSnapshots(): Promise<CleanupResult>;
export function purgeCallLogs(): Promise<CleanupResult>;
export function purgeDetailedLogs(): Promise<CleanupResult>;
export function resetUsageHistory(period: string): Promise<ResetUsageHistoryResult>;
