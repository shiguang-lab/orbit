export function getJobRegistry(): {
  hasHandler(id: string): boolean;
  listJobs(): Array<Record<string, unknown> & { id: string; enabled: boolean }>;
  setEnabled(id: string, enabled: boolean): void;
  runNow(id: string): Promise<{ started: boolean; reason?: string }>;
};
