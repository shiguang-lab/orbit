export interface SyncResult {
  success: boolean;
  modelCount: number;
  providerCount: number;
  capabilityCount: number;
  dryRun: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
export function isModelsDevSyncEnvDisabled(): boolean;
export function isModelsDevSyncEnvForcedOn(): boolean;
export function getSyncStatus(): {
  enabled: boolean;
  lastSync: string | null;
  lastSyncModelCount: number;
  lastSyncCapabilityCount: number;
  nextSync: string | null;
  intervalMs: number;
};
export function resolveModelsDevSyncIntervalMs(configuredInterval: unknown, environmentSeconds?: string): number;
export function syncModelsDev(options?: {
  dryRun?: boolean;
  syncCapabilities?: boolean;
  maxRetries?: number;
  signal?: AbortSignal;
}): Promise<SyncResult>;
