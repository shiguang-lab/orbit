export interface SyncResult {
  success: boolean;
  modelCount: number;
  providerCount: number;
  source: string;
  dryRun: boolean;
  data?: Record<string, Record<string, Record<string, unknown>>>;
  error?: string;
  warnings?: string[];
}
export interface SyncStatus {
  enabled: boolean;
  lastSync: string | null;
  lastSyncModelCount: number;
  nextSync: string | null;
  intervalMs: number;
  sources: string[];
}
export function syncPricingFromSources(options?: { sources?: Array<"litellm">; dryRun?: boolean }): Promise<SyncResult>;
export function getSyncStatus(): SyncStatus;
export function clearSyncedPricing(): void;
