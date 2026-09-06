import { Injectable } from "@nestjs/common";
import { getJobRegistry } from "@shiguang-gateway/core-domain/control/jobs";
import { createErrorResponse } from "@shiguang-gateway/core-domain/shared/error-response";

@Injectable()
export class JobsService {
  list(): Response {
    try {
      const registry = getJobRegistry();
      const jobs = registry.listJobs().map((job: any) => ({
        id: job.id, type: job.type, cron: job.cron, intervalMs: job.intervalMs,
        enabled: job.enabled, envFlag: job.envFlag, config: job.config,
        createdAt: job.createdAt, updatedAt: job.updatedAt,
        lastRun: registry.getRuns(job.id, 1)[0] ?? null,
      }));
      return Response.json({ data: jobs });
    } catch (error) {
      console.error("[API] GET /api/jobs error:", error);
      return createErrorResponse({ status: 500, message: "Failed to list jobs" });
    }
  }

  async runs(id: string): Promise<Response> {
    try {
      const registry = getJobRegistry();
      if (!registry.listJobs().some((job: any) => job.id === id)) return createErrorResponse({ status: 404, message: "Job not found" });
      return Response.json({ data: registry.getRuns(id) });
    } catch (error) {
      console.error("[API] GET /api/jobs/:id/runs error:", error);
      return createErrorResponse({ status: 500, message: "Failed to load runs" });
    }
  }

  toggle(id: string, enabled: boolean): Response {
    try {
      const registry = getJobRegistry();
      if (!registry.listJobs().some((job: any) => job.id === id)) return createErrorResponse({ status: 404, message: "Job not found" });
      registry.setEnabled(id, enabled);
      return Response.json({ data: { id, enabled } });
    } catch (error) {
      console.error(`[API] POST /api/jobs/:id/${enabled ? "enable" : "disable"} error:`, error);
      return createErrorResponse({ status: 500, message: `Failed to ${enabled ? "enable" : "disable"} job` });
    }
  }

  async runNow(id: string): Promise<Response> {
    try {
      const registry = getJobRegistry();
      if (!registry.listJobs().some((job: any) => job.id === id)) return createErrorResponse({ status: 404, message: "Job not found" });
      const timeoutMs = Number(process.env.SHIGUANG_GATEWAY_RUNNOW_TIMEOUT_MS) || 30_000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          registry.runNow(id),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`runNow timed out after ${timeoutMs}ms`)), timeoutMs); }),
        ]);
        return Response.json({ data: result });
      } finally { if (timer) clearTimeout(timer); }
    } catch (error) {
      console.error("[API] POST /api/jobs/:id/run-now error:", error);
      return createErrorResponse({ status: 500, message: "Failed to run job" });
    }
  }
}
