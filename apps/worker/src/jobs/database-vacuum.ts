import { runNow as runVacuumNow } from "@orbit/core/db/vacuum";
import {
  getVacuumIntervalMs,
  getVacuumScheduleSettings,
  readVacuumState,
  resolveNextRunAt,
  writeVacuumState,
  type VacuumSchedulerState,
} from "@orbit/core/db/vacuum-schedule";

const MAX_TIMER_TIMEOUT_MS = 2_147_483_647;
type Timer = ReturnType<typeof setTimeout>;

export interface DatabaseVacuumSchedulerDependencies {
  getSettings: typeof getVacuumScheduleSettings;
  readState: typeof readVacuumState;
  writeState: typeof writeVacuumState;
  runVacuum: typeof runVacuumNow;
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  logError: (message: string, error: unknown) => void;
}

export function createDatabaseVacuumScheduler(dependencies: DatabaseVacuumSchedulerDependencies) {
  let timer: Timer | null = null;

  function scheduledState(anchorLastRunAt?: number | null): VacuumSchedulerState {
    const previous = dependencies.readState();
    const settings = dependencies.getSettings();
    const lastRunAt = anchorLastRunAt === undefined ? previous.lastRunAt : anchorLastRunAt;
    return {
      ...previous,
      enabled: settings.scheduledVacuum !== "never",
      intervalMs: getVacuumIntervalMs(settings.scheduledVacuum),
      isRunning: false,
      nextRunAt: resolveNextRunAt(settings, lastRunAt, dependencies.now()),
    };
  }

  function arm(state: VacuumSchedulerState): void {
    if (timer) dependencies.clearTimeout(timer);
    timer = null;
    if (!state.enabled || state.nextRunAt === null) return;
    const delayMs = Math.max(0, state.nextRunAt - dependencies.now());
    timer = dependencies.setTimeout(() => {
      timer = null;
      if (state.nextRunAt !== null && state.nextRunAt > dependencies.now()) {
        arm(state);
        return;
      }
      void dependencies.runVacuum().then(
        () => {
          const next = scheduledState();
          dependencies.writeState(next);
          arm(next);
        },
        (error) => {
          dependencies.logError("[Vacuum] Scheduled VACUUM failed", error);
          const next = scheduledState(dependencies.now());
          dependencies.writeState(next);
          arm(next);
        },
      );
    }, Math.min(delayMs, MAX_TIMER_TIMEOUT_MS));
    timer.unref?.();
  }

  return {
    start(): VacuumSchedulerState {
      if (timer) return dependencies.readState();
      const state = scheduledState();
      dependencies.writeState(state);
      arm(state);
      return state;
    },
    stop(): void {
      if (timer) dependencies.clearTimeout(timer);
      timer = null;
      dependencies.writeState({ ...dependencies.readState(), isRunning: false, nextRunAt: null });
    },
  };
}

const scheduler = createDatabaseVacuumScheduler({
  getSettings: getVacuumScheduleSettings,
  readState: readVacuumState,
  writeState: writeVacuumState,
  runVacuum: runVacuumNow,
  now: Date.now,
  setTimeout,
  clearTimeout,
  logError: console.error,
});

export function initVacuumScheduler(): VacuumSchedulerState { return scheduler.start(); }
export function stopVacuumScheduler(): void { scheduler.stop(); }
