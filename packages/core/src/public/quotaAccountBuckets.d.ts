export interface UsageQuotaSlim {
  used: number;
  total: number;
  resetAt: string | null;
}
export interface ClaudeUsageResult {
  quotas?: Record<string, UsageQuotaSlim | undefined>;
}
export declare const SATURATION_THRESHOLD_PCT: number;
export declare function isBucketSaturated(
  connectionId: string,
  windowKey: string,
  nowMs?: number,
): boolean;
export declare function recordUsage(
  connectionId: string,
  windowKey: string,
  usedPct: number,
  resetAt: string | null,
  nowMs?: number,
): void;
export declare function updateAccountBuckets(
  connectionId: string,
  usageResult: ClaudeUsageResult | null | undefined,
  nowMs?: number,
): void;
