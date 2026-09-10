import { runAllLogExports } from "../logExport/runner.ts";
import type { JobRegistry } from "../jobRegistry/registry.ts";

export const LOG_EXPORT_JOB_ID = "log_export";
const DEFAULT_CRON = "0 * * * *";

export function getLogExportCron(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.ORBIT_LOG_EXPORT_CRON?.trim();
  return raw || DEFAULT_CRON;
}

export async function runLogExportJob() {
  const summary = await runAllLogExports();
  const failed = summary.destinations.filter((destination) => !destination.success);
  if (summary.exported > 0 || failed.length > 0) {
    console.log(`[LogExport] destinations=${summary.destinations.length} exported=${summary.exported} failures=${failed.length}`);
  }
  return {
    success: failed.length === 0,
    recordsAffected: summary.exported,
    error: failed.length ? failed.map((item) => `${item.destinationName}: ${item.error ?? "unknown error"}`).join("; ") : undefined,
  };
}

export function registerLogExportJob(registry: JobRegistry): void {
  registry.register({
    id: LOG_EXPORT_JOB_ID,
    type: "cron",
    cron: getLogExportCron(),
    intervalMs: null,
    enabled: true,
    envFlag: null,
    config: { timezone: "UTC" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    handler: runLogExportJob,
    cronGetter: getLogExportCron,
  });
}
