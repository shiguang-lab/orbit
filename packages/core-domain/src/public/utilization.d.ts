export type UtilizationTimeRange = "1h" | "24h" | "7d" | "30d";
export interface ProviderUtilizationPoint { timestamp: string; provider: string; remainingPct: number; isExhausted: boolean; windowKey: string; }
export interface ConnectionMetaEntry { email: string | null; name: string | null; displayName: string | null; }
export interface ProviderUtilizationResponse { timeRange: UtilizationTimeRange; bucketSizeMinutes: number; providers: string[]; data: ProviderUtilizationPoint[]; connectionMeta?: Record<string, ConnectionMetaEntry>; }
export const BUCKET_SIZES: Record<UtilizationTimeRange, number>;
