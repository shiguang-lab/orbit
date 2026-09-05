export function syncPricingFromSources(options?: { sources?: Array<'litellm'>; dryRun?: boolean }): Promise<{
  success: boolean;
  syncedProviders?: number;
  syncedModels?: number;
  totalSynced?: number;
  sources?: Record<string, unknown>;
  [key: string]: unknown;
}>;
export function getSyncStatus(): Record<string, unknown>;
export function clearSyncedPricing(): void;
