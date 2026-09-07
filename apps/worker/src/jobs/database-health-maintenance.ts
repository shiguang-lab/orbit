import {
  runManagedDbHealthCheck,
  runManagedWalCheckpoint,
} from "@orbit/core/db/health";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
type Timer = ReturnType<typeof setInterval>;

export interface DatabaseHealthMaintenanceDependencies {
  runHealthCheck: () => unknown;
  runWalCheckpoint: () => unknown;
  setInterval: (callback: () => void, delayMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  logError: (message: string, error: unknown) => void;
}

export interface DatabaseHealthMaintenanceIntervals {
  healthCheckMs: number;
  walTruncateMs: number;
}

function readInterval(name: string): number {
  const value = process.env[name];
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_INTERVAL_MS;
}

export function getDatabaseHealthMaintenanceIntervals(): DatabaseHealthMaintenanceIntervals {
  return {
    healthCheckMs: readInterval("ORBIT_DB_HEALTHCHECK_INTERVAL_MS"),
    walTruncateMs: readInterval("ORBIT_WAL_TRUNCATE_INTERVAL_MS"),
  };
}

export function createDatabaseHealthMaintenance(
  dependencies: DatabaseHealthMaintenanceDependencies,
) {
  let healthCheckTimer: Timer | null = null;
  let walTruncateTimer: Timer | null = null;
  let started = false;

  function execute(operation: () => unknown, failureMessage: string): void {
    try {
      operation();
    } catch (error) {
      dependencies.logError(failureMessage, error);
    }
  }

  function schedule(
    intervalMs: number,
    operation: () => unknown,
    failureMessage: string,
  ): Timer | null {
    if (intervalMs <= 0) return null;
    const timer = dependencies.setInterval(() => {
      execute(operation, failureMessage);
    }, intervalMs);
    timer.unref?.();
    return timer;
  }

  return {
    start(intervals: DatabaseHealthMaintenanceIntervals): void {
      if (started) return;
      started = true;
      execute(dependencies.runHealthCheck, "[DB] Startup health-check failed");
      healthCheckTimer = schedule(
        intervals.healthCheckMs,
        dependencies.runHealthCheck,
        "[DB] Periodic health-check failed",
      );
      walTruncateTimer = schedule(
        intervals.walTruncateMs,
        dependencies.runWalCheckpoint,
        "[DB] Periodic WAL truncate failed",
      );
    },
    stop(): void {
      if (healthCheckTimer) dependencies.clearInterval(healthCheckTimer);
      if (walTruncateTimer) dependencies.clearInterval(walTruncateTimer);
      healthCheckTimer = null;
      walTruncateTimer = null;
      started = false;
    },
  };
}

const maintenance = createDatabaseHealthMaintenance({
  runHealthCheck: () => runManagedDbHealthCheck({
    autoRepair: true,
    skipIntegrityCheck: process.env.ORBIT_SKIP_DB_HEALTHCHECK === "1",
  }),
  runWalCheckpoint: () => {
    if (runManagedWalCheckpoint("TRUNCATE")) {
      console.log("[DB] Periodic SQLite WAL checkpoint completed (TRUNCATE).");
    }
  },
  setInterval,
  clearInterval,
  logError: (message, error) => {
    console.warn(`${message}:`, error instanceof Error ? error.message : String(error));
  },
});

export function startDatabaseHealthMaintenance(): void {
  maintenance.start(getDatabaseHealthMaintenanceIntervals());
}

export function stopDatabaseHealthMaintenance(): void {
  maintenance.stop();
}
