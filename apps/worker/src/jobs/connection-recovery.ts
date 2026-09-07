import {
  resolveConnectionRecoveryIntervalMs,
  runConnectionRecoveryTick,
} from "@orbit/core/resilience/connection-recovery";
import { isAutomatedTestProcess } from "@orbit/utils/process";

const STARTUP_DELAY_MS = 15_000;
const LOG_PREFIX = "[ConnectionRecovery]";
const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
type Timer = ReturnType<typeof setTimeout>;

export interface ConnectionRecoverySchedulerDependencies {
  runTick: typeof runConnectionRecoveryTick;
  resolveIntervalMs: typeof resolveConnectionRecoveryIntervalMs;
  disabled: () => boolean;
  setTimeout: (callback: () => void, delayMs: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  setInterval: (callback: () => void, intervalMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  log: Pick<Console, "log" | "warn">;
}

export function createConnectionRecoveryScheduler(dependencies: ConnectionRecoverySchedulerDependencies) {
  let startupTimer: Timer | null = null;
  let intervalTimer: Timer | null = null;
  const tickLogger = {
    info: (message: string) => dependencies.log.log(message),
    warn: (message: string) => dependencies.log.warn(message),
  };
  const runTick = () => {
    void dependencies.runTick({ logger: tickLogger }).catch((error: unknown) => {
      dependencies.log.warn(`${LOG_PREFIX} tick error (non-fatal): ${error instanceof Error ? error.message : String(error)}`);
    });
  };
  return {
    start(): void {
      if (startupTimer || intervalTimer || dependencies.disabled()) return;
      const tickMs = dependencies.resolveIntervalMs();
      dependencies.log.log(`${LOG_PREFIX} Starting proactive cooldown recovery (tick every ${Math.round(tickMs / 1000)}s)`);
      startupTimer = dependencies.setTimeout(() => {
        startupTimer = null;
        runTick();
        intervalTimer = dependencies.setInterval(runTick, tickMs);
        intervalTimer.unref?.();
      }, STARTUP_DELAY_MS);
      startupTimer.unref?.();
    },
    stop(): void {
      if (startupTimer) dependencies.clearTimeout(startupTimer);
      if (intervalTimer) dependencies.clearInterval(intervalTimer);
      startupTimer = null;
      intervalTimer = null;
    },
  };
}

function envFlagEnabled(name: string): boolean {
  const value = process.env[name];
  return !!value && TRUE_ENV_VALUES.has(value.trim().toLowerCase());
}
const scheduler = createConnectionRecoveryScheduler({
  runTick: runConnectionRecoveryTick,
  resolveIntervalMs: resolveConnectionRecoveryIntervalMs,
  disabled: () => envFlagEnabled("ORBIT_DISABLE_CONNECTION_RECOVERY") ||
    envFlagEnabled("ORBIT_DISABLE_BACKGROUND_SERVICES") ||
    process.env.NEXT_PHASE === "phase-production-build" || isAutomatedTestProcess(),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  log: console,
});
export function initConnectionRecoveryScheduler(): void { scheduler.start(); }
export function stopConnectionRecoveryScheduler(): void { scheduler.stop(); }
