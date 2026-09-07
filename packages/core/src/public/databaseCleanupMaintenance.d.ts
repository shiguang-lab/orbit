export interface CleanupResult {
  deleted: number;
  errors: number;
  deletedArtifacts?: number;
}

export interface AutoCleanupResult {
  totalDeleted: number;
  totalErrors: number;
  results: Record<string, CleanupResult>;
}

export function runAutoCleanup(): Promise<AutoCleanupResult>;
export function cleanupProxyLogs(): Promise<CleanupResult>;
