import type { VacuumSchedulerState } from "./databaseVacuum.d.ts";

export function initVacuumScheduler(): VacuumSchedulerState;
export function stop(): void;
