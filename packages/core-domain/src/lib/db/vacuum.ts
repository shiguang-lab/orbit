import { DEFAULT_DATABASE_SETTINGS } from "../../types/databaseSettings.ts";
import { getDbInstance } from "./core";

export interface VacuumSchedulerState {
  enabled: boolean;
  intervalMs: number;
  lastRunAt: number | null;
  lastError: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
  nextRunAt: number | null;
}
export type ScheduledVacuum = (typeof DEFAULT_DATABASE_SETTINGS)["optimization"]["scheduledVacuum"];
export interface VacuumScheduleSettings { scheduledVacuum: ScheduledVacuum; vacuumHour: number }

const HOUR_MS = 3_600_000;
const NOMINAL_INTERVAL_MS: Record<ScheduledVacuum, number> = {
  never: 0, daily: 24 * HOUR_MS, weekly: 7 * 24 * HOUR_MS, monthly: 30 * 24 * HOUR_MS,
};
const VALID_SCHEDULES = new Set<ScheduledVacuum>(["never", "daily", "weekly", "monthly"]);
const KEY_VALUE_NAMESPACE = "scheduler";
const KEY_VALUE_KEY = "vacuum";
const STATE_DEFAULTS: VacuumSchedulerState = {
  enabled: false, intervalMs: 0, lastRunAt: null, lastError: null,
  lastDurationMs: null, isRunning: false, nextRunAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function parseJsonSafe(raw: string | null): unknown {
  if (raw === null) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
}
function readNamespace(namespace: string): Record<string, unknown> {
  const rows = getDbInstance().prepare("SELECT key, value FROM key_value WHERE namespace = ?")
    .all(namespace) as Array<{ key: string; value: string | null }>;
  const values: Record<string, unknown> = {};
  for (const row of rows) values[row.key] = parseJsonSafe(row.value);
  return values;
}
function normalizeSchedule(value: unknown, fallback: ScheduledVacuum): ScheduledVacuum {
  return typeof value === "string" && VALID_SCHEDULES.has(value as ScheduledVacuum)
    ? value as ScheduledVacuum : fallback;
}
function normalizeVacuumHour(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(23, Math.max(0, Math.floor(numeric))) : fallback;
}
function mergeOptimization(target: VacuumScheduleSettings, value: unknown): VacuumScheduleSettings {
  if (!isRecord(value)) return target;
  return {
    scheduledVacuum: normalizeSchedule(value.scheduledVacuum, target.scheduledVacuum),
    vacuumHour: normalizeVacuumHour(value.vacuumHour, target.vacuumHour),
  };
}

export function getVacuumScheduleSettings(): VacuumScheduleSettings {
  let settings: VacuumScheduleSettings = {
    scheduledVacuum: DEFAULT_DATABASE_SETTINGS.optimization.scheduledVacuum,
    vacuumHour: DEFAULT_DATABASE_SETTINGS.optimization.vacuumHour,
  };
  const mainSettings = readNamespace("settings");
  const databaseSettingsValue = mainSettings.databaseSettings;
  if (isRecord(databaseSettingsValue)) settings = mergeOptimization(settings, databaseSettingsValue.optimization);
  settings = mergeOptimization(settings, mainSettings.optimization);
  const databaseSettings = readNamespace("databaseSettings");
  settings = mergeOptimization(settings, databaseSettings.optimization);
  return {
    scheduledVacuum: normalizeSchedule(
      databaseSettings["optimization.scheduledVacuum"] ?? databaseSettings.scheduledVacuum,
      settings.scheduledVacuum,
    ),
    vacuumHour: normalizeVacuumHour(
      databaseSettings["optimization.vacuumHour"] ?? databaseSettings.vacuumHour,
      settings.vacuumHour,
    ),
  };
}
export function getVacuumIntervalMs(schedule: ScheduledVacuum): number {
  return NOMINAL_INTERVAL_MS[schedule];
}
function atVacuumHour(timestamp: number, hour: number): Date {
  const date = new Date(timestamp); date.setHours(hour, 0, 0, 0); return date;
}
function addFrequency(date: Date, frequency: Exclude<ScheduledVacuum, "never">): Date {
  const next = new Date(date.getTime());
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}
export function resolveNextRunAt(
  settings: VacuumScheduleSettings, lastRunAt: number | null, now = Date.now(),
): number | null {
  const frequency = settings.scheduledVacuum;
  if (frequency === "never") return null;
  const hour = normalizeVacuumHour(settings.vacuumHour, DEFAULT_DATABASE_SETTINGS.optimization.vacuumHour);
  let candidate: Date;
  if (typeof lastRunAt === "number" && Number.isFinite(lastRunAt) && lastRunAt > 0) {
    candidate = atVacuumHour(lastRunAt, hour);
    if (candidate.getTime() <= lastRunAt) candidate = addFrequency(candidate, frequency);
  } else {
    candidate = atVacuumHour(now, hour);
    if (candidate.getTime() <= now) candidate = addFrequency(candidate, "daily");
  }
  while (candidate.getTime() <= now) candidate = addFrequency(candidate, frequency);
  return candidate.getTime();
}
export function readVacuumState(): VacuumSchedulerState {
  const row = getDbInstance().prepare(
    "SELECT value FROM key_value WHERE namespace = ? AND key = ? LIMIT 1",
  ).get(KEY_VALUE_NAMESPACE, KEY_VALUE_KEY) as { value: string } | undefined;
  if (!row?.value) return { ...STATE_DEFAULTS };
  try { return { ...STATE_DEFAULTS, ...JSON.parse(row.value) as Partial<VacuumSchedulerState> }; }
  catch { return { ...STATE_DEFAULTS }; }
}
export function writeVacuumState(state: VacuumSchedulerState): void {
  getDbInstance().prepare(
    "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES (?, ?, ?)",
  ).run(KEY_VALUE_NAMESPACE, KEY_VALUE_KEY, JSON.stringify(state));
}
export function getState(): VacuumSchedulerState { return readVacuumState(); }

export async function runNow(): Promise<{ success: boolean; durationMs: number; error?: string }> {
  const state = readVacuumState();
  if (state.isRunning) return { success: false, durationMs: 0, error: "already_running" };
  writeVacuumState({ ...state, isRunning: true });
  const start = Date.now();
  try {
    getDbInstance().exec("VACUUM");
    const durationMs = Date.now() - start;
    const settings = getVacuumScheduleSettings();
    writeVacuumState({
      enabled: settings.scheduledVacuum !== "never",
      intervalMs: getVacuumIntervalMs(settings.scheduledVacuum),
      lastRunAt: start, lastError: null, lastDurationMs: durationMs, isRunning: false,
      nextRunAt: resolveNextRunAt(settings, start),
    });
    return { success: true, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - start;
    const settings = getVacuumScheduleSettings();
    writeVacuumState({
      ...state,
      enabled: settings.scheduledVacuum !== "never",
      intervalMs: getVacuumIntervalMs(settings.scheduledVacuum),
      lastError: message, lastDurationMs: durationMs, isRunning: false,
      nextRunAt: resolveNextRunAt(settings, Date.now(), Date.now()),
    });
    return { success: false, durationMs, error: message };
  }
}
