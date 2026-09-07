import type { ProviderUtilizationPoint, QuotaSnapshotRow } from "./usageUtilization.js";

export function getQuotaSnapshots(options: {
  provider?: string;
  connectionId?: string;
  since: string;
  until?: string;
}): QuotaSnapshotRow[];
export function getAggregatedSnapshots(options: {
  provider?: string;
  since: string;
  until?: string;
  bucketMinutes: number;
  aggregateBy?: "provider" | "connection";
}): ProviderUtilizationPoint[];
