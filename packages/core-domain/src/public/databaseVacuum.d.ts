export interface VacuumSchedulerState {
  enabled: boolean;
  intervalMs: number;
  lastRunAt: number | null;
  lastError: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
  nextRunAt: number | null;
}
export function getState(): VacuumSchedulerState;
export function runNow(): Promise<{ success: boolean; durationMs: number; error?: string }>;
