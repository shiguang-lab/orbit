import { getModelSyncInternalBaseUrl } from "@shiguang-gateway/core-domain/runtime/model-sync-client";
import {
  revalidateCodexCatalogsOnStartup,
  runModelSyncCycle,
} from "@shiguang-gateway/core-domain/runtime/model-sync-operation";

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 5_000;

type Timer = ReturnType<typeof setTimeout>;

export type ModelSyncSchedulerDependencies = {
  runCycle: (apiBaseUrl: string) => Promise<void>;
  revalidateCodexCatalogs: (apiBaseUrl: string) => Promise<void>;
  setTimeout: (callback: () => void, delayMs: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  setInterval: (callback: () => void, intervalMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  intervalHours: string | undefined;
  log: (message: string) => void;
};

export function resolveModelSyncIntervalMs(
  rawHours: string | undefined,
  fallbackMs = DEFAULT_INTERVAL_MS
): number {
  const hours = Number.parseInt(rawHours ?? "", 10);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : fallbackMs;
}

export function createModelSyncScheduler(
  dependencies: ModelSyncSchedulerDependencies
): { start(apiBaseUrl?: string, intervalMs?: number): void; stop(): void } {
  let startupTimer: Timer | null = null;
  let schedulerTimer: Timer | null = null;

  return {
    start(apiBaseUrl = getModelSyncInternalBaseUrl(), intervalMs = DEFAULT_INTERVAL_MS): void {
      if (startupTimer || schedulerTimer) {
        dependencies.log("[ModelSync] Scheduler already running — skipping start");
        return;
      }

      const effectiveIntervalMs = resolveModelSyncIntervalMs(
        dependencies.intervalHours,
        intervalMs
      );
      dependencies.log(
        `[ModelSync] Scheduler started — interval: ${effectiveIntervalMs / 3_600_000}h`
      );

      startupTimer = dependencies.setTimeout(() => {
        startupTimer = null;
        void dependencies.runCycle(apiBaseUrl);
      }, STARTUP_DELAY_MS);
      startupTimer.unref?.();

      void dependencies.revalidateCodexCatalogs(apiBaseUrl).catch(() => {
        // The periodic model sync remains available if startup revalidation fails.
      });

      schedulerTimer = dependencies.setInterval(() => {
        void dependencies.runCycle(apiBaseUrl);
      }, effectiveIntervalMs);
      schedulerTimer.unref?.();
    },

    stop(): void {
      if (startupTimer) {
        dependencies.clearTimeout(startupTimer);
        startupTimer = null;
      }
      if (schedulerTimer) {
        dependencies.clearInterval(schedulerTimer);
        schedulerTimer = null;
      }
      dependencies.log("[ModelSync] Scheduler stopped");
    },
  };
}

const scheduler = createModelSyncScheduler({
  runCycle: runModelSyncCycle,
  revalidateCodexCatalogs: (apiBaseUrl) => revalidateCodexCatalogsOnStartup({ apiBaseUrl }),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  intervalHours: process.env.MODEL_SYNC_INTERVAL_HOURS,
  log: console.log,
});

export function startModelSyncScheduler(): void {
  scheduler.start();
}

export function stopModelSyncScheduler(): void {
  scheduler.stop();
}
