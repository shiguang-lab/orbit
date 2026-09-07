import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import {
  JOB_COMMAND_PROTOCOL_VERSION,
  WORKER_JOB_COMMAND_AUTH_HEADER,
  WORKER_JOB_COMMAND_PATH,
  parseJobCommand,
  type JobCommand,
  type JobCommandFailureCode,
  type JobCommandResponse,
} from "@orbit/contracts/job-command";
import { getJobRegistry } from "@orbit/core/jobs/runtime-registry";

export interface WorkerJobCommandRegistry {
  hasHandler(id: string): boolean;
  listJobs(): Array<{ id: string; enabled: boolean }>;
  setEnabled(id: string, enabled: boolean): void;
  runNow(id: string): Promise<{ started: boolean; reason?: string }>;
}
const MAX_BODY_BYTES = 16 * 1024;

function configuredToken(): string {
  const token = process.env.ORBIT_WORKER_COMMAND_TOKEN?.trim()
    || process.env.JWT_SECRET?.trim();
  if (!token) throw new Error("Worker command authentication token is not configured");
  return token;
}

function authenticated(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function failure(code: JobCommandFailureCode, message: string): JobCommandResponse {
  return { version: JOB_COMMAND_PROTOCOL_VERSION, success: false, code, message };
}

export async function executeWorkerJobCommand(
  command: JobCommand,
  registry: WorkerJobCommandRegistry,
): Promise<{ status: number; body: JobCommandResponse }> {
  const job = registry.listJobs().find((candidate) => candidate.id === command.jobId);
  if (!job) return { status: 404, body: failure("not_found", "Job not found") };

  if (command.command === "set-enabled") {
    if (command.enabled && !registry.hasHandler(command.jobId)) {
      return { status: 409, body: failure("no_handler", "Job handler is not registered") };
    }
    registry.setEnabled(command.jobId, command.enabled);
    return {
      status: 200,
      body: {
        version: JOB_COMMAND_PROTOCOL_VERSION,
        success: true,
        command: command.command,
        jobId: command.jobId,
        data: { enabled: command.enabled },
      },
    };
  }

  const result = await registry.runNow(command.jobId);
  if (!result.started) {
    const code = (result.reason ?? "execution_failed") as JobCommandFailureCode;
    return { status: code === "not_found" ? 404 : 409, body: failure(code, `Job was not started: ${code}`) };
  }
  return {
    status: 200,
    body: {
      version: JOB_COMMAND_PROTOCOL_VERSION,
      success: true,
      command: command.command,
      jobId: command.jobId,
      data: { started: true },
    },
  };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_too_large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res: ServerResponse, status: number, body: JobCommandResponse): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export async function startWorkerJobCommandServer(): Promise<Server> {
  const expectedToken = configuredToken();
  const registry = getJobRegistry();
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "ok", service: "worker" }));
      return;
    }
    if (req.method !== "POST" || req.url !== WORKER_JOB_COMMAND_PATH) {
      send(res, 404, failure("not_found", "Command endpoint not found"));
      return;
    }
    const tokenHeader = req.headers[WORKER_JOB_COMMAND_AUTH_HEADER];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    if (!authenticated(token, expectedToken)) {
      send(res, 401, failure("unauthorized", "Unauthorized"));
      return;
    }
    try {
      const command = parseJobCommand(await readJson(req));
      if (!command) {
        send(res, 400, failure("invalid_request", "Invalid job command"));
        return;
      }
      const result = await executeWorkerJobCommand(command, registry);
      send(res, result.status, result.body);
    } catch (error) {
      const isInputError = error instanceof SyntaxError
        || (error instanceof Error && error.message === "request_too_large");
      console.error("[worker] job command failed:", error);
      send(
        res,
        isInputError ? 400 : 500,
        failure(isInputError ? "invalid_request" : "execution_failed", isInputError ? "Invalid request body" : "Job command failed"),
      );
    }
  });
  const host = process.env.WORKER_COMMAND_HOST?.trim() || "127.0.0.1";
  const configuredPort = Number(process.env.WORKER_COMMAND_PORT);
  const port = Number.isInteger(configuredPort) && configuredPort >= 0 ? configuredPort : 8791;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  console.log(`[worker] command endpoint listening on http://${host}:${port}${WORKER_JOB_COMMAND_PATH}`);
  return server;
}

export async function stopWorkerJobCommandServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
