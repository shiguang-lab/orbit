import { Injectable } from "@nestjs/common";
import {
  getJobProjection,
  listJobProjections,
  listJobRunProjections,
} from "@shiguang-gateway/core-domain/control/jobs";
import { createErrorResponse } from "@shiguang-gateway/core-domain/shared/error-response";
import {
  JOB_COMMAND_PROTOCOL_VERSION,
  WORKER_JOB_COMMAND_AUTH_HEADER,
  WORKER_JOB_COMMAND_PATH,
  type JobCommand,
  type JobCommandResponse,
} from "@shiguang-gateway/contracts/job-command";

function workerCommandUrl(): URL {
  const base = process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_URL?.trim() || "http://127.0.0.1:8791";
  const url = new URL(WORKER_JOB_COMMAND_PATH, `${base.replace(/\/$/, "")}/`);
  if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid worker command URL");
  }
  return url;
}

function workerCommandToken(): string {
  const token = process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN?.trim()
    || process.env.JWT_SECRET?.trim();
  if (!token) throw new Error("Worker command authentication token is not configured");
  return token;
}

@Injectable()
export class JobsService {
  list(): Response {
    try {
      const jobs = listJobProjections().map((job) => ({
        id: job.id, type: job.type, cron: job.cron, intervalMs: job.intervalMs,
        enabled: job.enabled, envFlag: job.envFlag, config: job.config,
        createdAt: job.createdAt, updatedAt: job.updatedAt,
        lastRun: listJobRunProjections(job.id, 1)[0] ?? null,
      }));
      return Response.json({ data: jobs });
    } catch (error) {
      console.error("[API] GET /api/jobs error:", error);
      return createErrorResponse({ status: 500, message: "Failed to list jobs" });
    }
  }

  async runs(id: string): Promise<Response> {
    try {
      if (!getJobProjection(id)) return createErrorResponse({ status: 404, message: "Job not found" });
      return Response.json({ data: listJobRunProjections(id) });
    } catch (error) {
      console.error("[API] GET /api/jobs/:id/runs error:", error);
      return createErrorResponse({ status: 500, message: "Failed to load runs" });
    }
  }

  async toggle(id: string, enabled: boolean): Promise<Response> {
    try {
      if (!getJobProjection(id)) return createErrorResponse({ status: 404, message: "Job not found" });
      return await this.sendCommand({ version: JOB_COMMAND_PROTOCOL_VERSION, command: "set-enabled", jobId: id, enabled });
    } catch (error) {
      console.error(`[API] POST /api/jobs/:id/${enabled ? "enable" : "disable"} error:`, error);
      return createErrorResponse({ status: 503, message: `Failed to ${enabled ? "enable" : "disable"} job` });
    }
  }

  async runNow(id: string): Promise<Response> {
    try {
      if (!getJobProjection(id)) return createErrorResponse({ status: 404, message: "Job not found" });
      return await this.sendCommand({ version: JOB_COMMAND_PROTOCOL_VERSION, command: "run-now", jobId: id });
    } catch (error) {
      console.error("[API] POST /api/jobs/:id/run-now error:", error);
      return createErrorResponse({ status: 503, message: "Failed to run job" });
    }
  }

  private async sendCommand(command: JobCommand): Promise<Response> {
    const timeoutMs = Number(process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TIMEOUT_MS) || 30_000;
    let response: Response;
    try {
      response = await fetch(workerCommandUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [WORKER_JOB_COMMAND_AUTH_HEADER]: workerCommandToken(),
        },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      console.error("[API] Worker job command unavailable:", error);
      return createErrorResponse({ status: 503, message: "Worker job command service unavailable" });
    }
    const body = await response.json().catch(() => null) as JobCommandResponse | null;
    if (!response.ok || !body || body.success !== true) {
      const status = response.status === 404 || response.status === 409 ? response.status : 502;
      const message = body && !body.success ? body.message : "Worker job command failed";
      return createErrorResponse({ status, message });
    }
    return Response.json({ data: body.data });
  }
}
