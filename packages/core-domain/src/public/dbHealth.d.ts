export interface DbHealthCheckResult {
  isHealthy: boolean;
  issues: Array<{
    type: "integrity_check_failed" | "broken_reference" | "stale_snapshot" | "invalid_state";
    table: string;
    description: string;
    count: number;
  }>;
  repairedCount: number;
  backupCreated: boolean;
  autoRepair: boolean;
  checkedAt: string;
  driver: {
    name: "better-sqlite3" | "node:sqlite" | "bun:sqlite" | "sql.js";
    degraded: boolean;
  };
}

export function isNativeSqliteLoadError(error: unknown): boolean;
export function runManagedDbHealthCheck(options?: {
  autoRepair?: boolean;
  skipIntegrityCheck?: boolean;
}): DbHealthCheckResult;
export function runManagedWalCheckpoint(
  mode?: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE",
): boolean;
