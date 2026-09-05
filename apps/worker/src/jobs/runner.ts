import type { WorkerJob } from "./registry.js";

type Logger = (...args: unknown[]) => void;

/** Run the worker-owned manifest and return the jobs that started. */
export async function startWorkerJobs(
  jobs: readonly WorkerJob[],
  log: Logger,
): Promise<string[]> {
  const started: string[] = [];
  for (const job of jobs) {
    try {
      const mod = await import(job.modulePath) as Record<string, unknown>;
      if (job.mode === "call") {
        const fn = mod[job.exportName];
        if (typeof fn !== "function") {
          throw new Error(`missing export ${job.exportName}`);
        }
        await (fn as () => unknown)();
      }
      started.push(job.name);
    } catch (error) {
      log(`failed to start ${job.name}:`, error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
  return started;
}
