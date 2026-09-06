import {
  cleanupProxyLogs,
  runAutoCleanup,
} from "@shiguang-gateway/core-domain/db/cleanup-maintenance";
import { runNow as runVacuumNow } from "@shiguang-gateway/core-domain/db/vacuum";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;
type Timer = ReturnType<typeof setTimeout>;

export interface DatabaseCleanupSchedulerDependencies {
  runCleanup: typeof runAutoCleanup;
  cleanupProxyLogs: typeof cleanupProxyLogs;
  runVacuum: typeof runVacuumNow;
  setTimeout: (callback: () => void, delayMs: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  setInterval: (callback: () => void, intervalMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  log: Pick<Console, "log" | "error">;
}

export function createDatabaseCleanupScheduler(dependencies: DatabaseCleanupSchedulerDependencies) {
  let startupTimer: Timer | null = null;
  let intervalTimer: Timer | null = null;

  async function run(label: "Startup" | "Periodic"): Promise<void> {
    try {
      const result = await dependencies.runCleanup();
      const proxyResult = await dependencies.cleanupProxyLogs();
      const totalDeleted = result.totalDeleted + proxyResult.deleted;
      if (totalDeleted === 0) return;
      dependencies.log.log(`[Cleanup] ${label} cleanup freed ${totalDeleted} rows. Running VACUUM...`);
      const vacuum = await dependencies.runVacuum();
      if (vacuum.success) dependencies.log.log(`[Cleanup] VACUUM completed after ${label.toLowerCase()} cleanup.`);
      else dependencies.log.error(`[Cleanup] VACUUM after cleanup failed: ${vacuum.error ?? "unknown error"}`);
    } catch (error) {
      dependencies.log.error(`[Cleanup] ${label} cleanup failed:`, error);
    }
  }

  return {
    start(): void {
      if (startupTimer || intervalTimer) return;
      startupTimer = dependencies.setTimeout(() => {
        startupTimer = null;
        void run("Startup");
      }, STARTUP_DELAY_MS);
      startupTimer.unref?.();
      intervalTimer = dependencies.setInterval(() => void run("Periodic"), CLEANUP_INTERVAL_MS);
      intervalTimer.unref?.();
      dependencies.log.log("[Cleanup] Background cleanup scheduler started (every 6 hours).");
    },
    stop(): void {
      if (startupTimer) dependencies.clearTimeout(startupTimer);
      if (intervalTimer) dependencies.clearInterval(intervalTimer);
      startupTimer = null;
      intervalTimer = null;
    },
  };
}

const scheduler = createDatabaseCleanupScheduler({
  runCleanup: runAutoCleanup,
  cleanupProxyLogs,
  runVacuum: runVacuumNow,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  log: console,
});

export function startCleanupScheduler(): void {
  scheduler.start();
}

export function stopCleanupScheduler(): void {
  scheduler.stop();
}
