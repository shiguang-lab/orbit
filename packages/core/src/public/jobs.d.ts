export interface JobRecord {
  id: string;
  type: "interval" | "cron";
  cron?: string | null;
  intervalMs?: number | null;
  enabled: boolean;
  envFlag?: string | null;
  config?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
export interface JobRun {
  id: number;
  jobId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: "running" | "success" | "failure";
  errorMessage?: string | null;
  recordsAffected: number;
  durationMs?: number | null;
}
export function listJobProjections(): JobRecord[];
export function getJobProjection(id: string): JobRecord | null;
export function listJobRunProjections(id: string, limit?: number): JobRun[];
