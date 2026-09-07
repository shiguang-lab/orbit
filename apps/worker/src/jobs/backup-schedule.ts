import {
  createBackup,
  readBackupSchedule,
  writeBackupSchedule,
} from "@orbit/core/backup/runtime";
import { matchesCron } from "@orbit/core/jobs/cron-match";

const DEFAULT_INTERVAL_MS = 30_000;
let timer: NodeJS.Timeout | null = null;
let tickInFlight: Promise<boolean> | null = null;

function getIntervalMs(): number {
  const parsed = Number(process.env.SHIGUANG_GATEWAY_BACKUP_SCHEDULE_JOB_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : DEFAULT_INTERVAL_MS;
}

function minuteKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

type BackupScheduleDependencies = {
  create?: typeof createBackup;
};

async function executeBackupScheduleTick(
  now: Date,
  dependencies: BackupScheduleDependencies,
): Promise<boolean> {
  const schedule = readBackupSchedule();
  if (!schedule?.enabled || !schedule.cron || !matchesCron(schedule.cron, now)) return false;
  if (schedule.encrypt) {
    console.error("[BackupSchedule] Encrypted schedules require a non-interactive key source; skipping.");
    return false;
  }
  if (schedule.cloud) {
    console.error("[BackupSchedule] Cloud schedules require an explicit uploader; skipping.");
    return false;
  }
  if (schedule.lastRunAt) {
    const lastRun = new Date(schedule.lastRunAt);
    if (!Number.isNaN(lastRun.getTime()) && minuteKey(lastRun) === minuteKey(now)) return false;
  }

  try {
    const result = await (dependencies.create ?? createBackup)({
      retention: schedule.retention || undefined,
      now,
    });
    if (result.backedUp === 0) return false;
    const latestSchedule = readBackupSchedule();
    if (latestSchedule) {
      writeBackupSchedule({ ...latestSchedule, lastRunAt: now.toISOString() });
    }
    return true;
  } catch (error) {
    console.error("[BackupSchedule] Job failed:", error);
    return false;
  }
}

/** Evaluate and execute one persisted backup schedule tick in the worker process. */
export async function runBackupScheduleTick(
  now: Date = new Date(),
  dependencies: BackupScheduleDependencies = {},
): Promise<boolean> {
  if (tickInFlight) return false;
  const current = executeBackupScheduleTick(now, dependencies);
  tickInFlight = current;
  try {
    return await current;
  } finally {
    if (tickInFlight === current) tickInFlight = null;
  }
}

export function startBackupScheduleJob(): NodeJS.Timeout {
  if (timer) return timer;
  timer = setInterval(() => {
    runBackupScheduleTick().catch((error) => console.error("[BackupSchedule] Tick failed:", error));
  }, getIntervalMs());
  timer.unref?.();
  return timer;
}

export function stopBackupScheduleJob(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
