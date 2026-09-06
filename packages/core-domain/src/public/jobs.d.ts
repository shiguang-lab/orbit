export function getJobRegistry(): {
  listJobs(): Array<Record<string, unknown> & { id: string }>;
  getRuns(id: string, limit?: number): unknown[];
  setEnabled(id: string, enabled: boolean): void;
  runNow(id: string): Promise<unknown>;
};
