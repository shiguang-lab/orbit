export function getSyncedCapabilities(provider?: string, modelId?: string): Record<string, unknown>;
export function getModelsDevPricing(): Record<string, unknown>;
export function getSyncStatus(): {
  enabled: boolean;
  lastSync: string | null;
  lastSyncModelCount: number;
  lastSyncCapabilityCount: number;
  nextSync: string | null;
  intervalMs: number;
};
export function syncModelsDev(options?: {
  dryRun?: boolean;
  syncCapabilities?: boolean;
}): Promise<Record<string, unknown>>;
export function startPeriodicSync(intervalMs?: number): void;
export function stopPeriodicSync(): void;
