import type { VacuumSchedulerState } from "./databaseVacuum.d.ts";
export type { VacuumSchedulerState } from "./databaseVacuum.d.ts";
export type ScheduledVacuum = "never" | "daily" | "weekly" | "monthly";
export interface VacuumScheduleSettings { scheduledVacuum: ScheduledVacuum; vacuumHour: number }
export function getVacuumScheduleSettings(): VacuumScheduleSettings;
export function getVacuumIntervalMs(schedule: ScheduledVacuum): number;
export function resolveNextRunAt(settings: VacuumScheduleSettings, lastRunAt: number | null, now?: number): number | null;
export function readVacuumState(): VacuumSchedulerState;
export function writeVacuumState(state: VacuumSchedulerState): void;
