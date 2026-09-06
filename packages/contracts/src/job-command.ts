export const JOB_COMMAND_PROTOCOL_VERSION = 1 as const;
export const WORKER_JOB_COMMAND_PATH = "/internal/jobs/commands/v1" as const;
export const WORKER_JOB_COMMAND_AUTH_HEADER = "x-shiguang-worker-command-token" as const;

export type JobCommand =
  | { version: typeof JOB_COMMAND_PROTOCOL_VERSION; command: "run-now"; jobId: string }
  | {
      version: typeof JOB_COMMAND_PROTOCOL_VERSION;
      command: "set-enabled";
      jobId: string;
      enabled: boolean;
    };

export type JobCommandFailureCode =
  | "invalid_request"
  | "unauthorized"
  | "not_found"
  | "disabled"
  | "no_handler"
  | "already_queued"
  | "env_disabled"
  | "execution_failed";

export type JobCommandResponse =
  | {
      version: typeof JOB_COMMAND_PROTOCOL_VERSION;
      success: true;
      command: JobCommand["command"];
      jobId: string;
      data: { started: true } | { enabled: boolean };
    }
  | {
      version: typeof JOB_COMMAND_PROTOCOL_VERSION;
      success: false;
      code: JobCommandFailureCode;
      message: string;
    };

export function parseJobCommand(value: unknown): JobCommand | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== JOB_COMMAND_PROTOCOL_VERSION) return null;
  if (typeof candidate.jobId !== "string" || candidate.jobId.trim() === "") return null;
  if (candidate.command === "run-now") {
    return { version: JOB_COMMAND_PROTOCOL_VERSION, command: "run-now", jobId: candidate.jobId };
  }
  if (candidate.command === "set-enabled" && typeof candidate.enabled === "boolean") {
    return {
      version: JOB_COMMAND_PROTOCOL_VERSION,
      command: "set-enabled",
      jobId: candidate.jobId,
      enabled: candidate.enabled,
    };
  }
  return null;
}
