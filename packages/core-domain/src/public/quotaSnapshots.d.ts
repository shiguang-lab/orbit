export interface AggregatedSnapshotRow { provider: string; timestamp: string; remainingPct: number; isExhausted: boolean; windowKey: string; }
export function getAggregatedSnapshots(options: { provider?: string; since?: string; bucketMinutes: number; aggregateBy: "connection" | "provider" }): AggregatedSnapshotRow[];
