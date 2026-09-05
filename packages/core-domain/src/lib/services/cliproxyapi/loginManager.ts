/**
 * Asynchronous CLI Login Job Manager for CLIProxyAPI.
 *
 * Spawns official CLIProxyAPI login commands (e.g. -codex-device-login, -claude-login)
 * in isolated background child processes, captures stdout/stderr to parse OAuth URLs
 * and user device codes, manages a 5-minute timeout lifecycle, and triggers automatic
 * credential persistence and connection import on successful completion.
 */

import { spawn, type ChildProcess } from "child_process";
import fsSync from "fs";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { DATA_DIR } from "../../db/core.ts";
import { scanCliProxyAuthDir, toConnectionPayload } from "../../oauth/utils/cliProxyAuthImport.ts";
import { createProviderConnection } from "../../../models/index.ts";
import { sanitizeErrorMessage } from "../../../../../open-sse/utils/error.ts";

export type CliproxyLoginProvider =
  | "codex"
  | "claude"
  | "antigravity"
  | "kimi"
  | "xai"
  | "gemini"
  | "qwen"
  | "github-copilot";

export interface CliproxyLoginJob {
  id: string;
  provider: CliproxyLoginProvider;
  status: "starting" | "awaiting_user" | "success" | "failed" | "timeout" | "canceled";
  authUrl?: string;
  userCode?: string;
  prompt?: string;
  error?: string;
  startedAt: number;
  expiresAt: number;
  terminalCommand: string;
}

interface InternalJob extends CliproxyLoginJob {
  child?: ChildProcess;
  timeoutTimer?: NodeJS.Timeout;
  rawLogs: string[];
}

const PROVIDER_FLAGS: Record<CliproxyLoginProvider, { flag: string; label: string }> = {
  codex: { flag: "-codex-device-login", label: "Codex / OpenAI" },
  claude: { flag: "-claude-login", label: "Claude Code" },
  antigravity: { flag: "-antigravity-login", label: "Google / Antigravity" },
  kimi: { flag: "-kimi-login", label: "Kimi / Moonshot" },
  xai: { flag: "-xai-login", label: "xAI / Grok" },
  gemini: { flag: "-gemini-login", label: "Google Gemini" },
  qwen: { flag: "-qwen-login", label: "Qwen / 通义千问" },
  "github-copilot": { flag: "-github-copilot-login", label: "GitHub Copilot" },
};

const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const jobs = new Map<string, InternalJob>();

function managedBinaryName(): string {
  return os.platform() === "win32" ? "cliproxyapi.exe" : "cliproxyapi";
}

function getBinaryPath(): string | null {
  const managedPath = path.join(DATA_DIR, "bin", managedBinaryName());
  if (fsSync.existsSync(managedPath)) {
    return managedPath;
  }
  return null;
}

function getConfigDir(): string {
  return path.join(DATA_DIR, "services", "cliproxy");
}

function getAuthDir(): string {
  return process.env.CLIPROXYAPI_AUTH_DIR || process.env.CLIPROXYAPI_CONFIG_DIR || path.join(getConfigDir(), "auth");
}

function sanitizeJob(job: InternalJob): CliproxyLoginJob {
  return {
    id: job.id,
    provider: job.provider,
    status: job.status,
    authUrl: job.authUrl,
    userCode: job.userCode,
    prompt: job.prompt,
    error: job.error,
    startedAt: job.startedAt,
    expiresAt: job.expiresAt,
    terminalCommand: job.terminalCommand,
  };
}

function extractOAuthUrlAndCode(text: string): { authUrl?: string; userCode?: string; prompt?: string } {
  let authUrl: string | undefined;
  let userCode: string | undefined;
  let prompt: string | undefined;

  const urlMatch = text.match(/https?:\/\/[^\s\)\'\"\`]+/i);
  if (urlMatch) {
    authUrl = urlMatch[0];
  }

  const codeMatch = text.match(/(?:user[_\s-]?code|code|device[_\s-]?code)(?:\s*(?:is|:|=)\s*)([A-Z0-9]{4,12}(?:-[A-Z0-9]{4,12})?)/i);
  if (codeMatch) {
    userCode = codeMatch[1];
  } else {
    const rawCode = text.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/);
    if (rawCode) {
      userCode = rawCode[1];
    }
  }

  const cleanLine = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.includes("INFO") && !l.includes("DEBUG") && !l.includes("WARN"))
    .join(" ");
  if (cleanLine) {
    prompt = cleanLine.slice(0, 300);
  }

  return { authUrl, userCode, prompt };
}

async function autoImportCredentials() {
  const authDirs = [getAuthDir(), path.join(os.homedir(), ".cli-proxy-api")];
  for (const dir of authDirs) {
    if (!fsSync.existsSync(dir)) continue;
    try {
      const { candidates } = await scanCliProxyAuthDir(dir, Date.now());
      for (const candidate of candidates) {
        try {
          await createProviderConnection(toConnectionPayload(candidate));
        } catch {
          // Ignore upsert duplicates
        }
      }
    } catch {
      // Ignore scan errors
    }
  }
}

export async function startLoginJob(provider: CliproxyLoginProvider): Promise<CliproxyLoginJob> {
  const providerMeta = PROVIDER_FLAGS[provider];
  if (!providerMeta) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  for (const existing of jobs.values()) {
    if (
      existing.provider === provider &&
      (existing.status === "starting" || existing.status === "awaiting_user")
    ) {
      return sanitizeJob(existing);
    }
  }

  const binaryPath = getBinaryPath();
  const configDir = getConfigDir();
  const authDir = getAuthDir();
  await fs.mkdir(configDir, { recursive: true });
  await fs.mkdir(authDir, { recursive: true });

  const configPath = path.join(configDir, "config.yaml");
  if (!fsSync.existsSync(configPath)) {
    await fs.writeFile(
      configPath,
      `port: 8317\nhost: 127.0.0.1\nauth-dir: ${authDir}\nlog_level: warn\n`,
      "utf8"
    );
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const terminalCommand = `docker exec -it shiguangGateway /app/data/bin/cliproxyapi -config /app/data/services/cliproxy/config.yaml ${providerMeta.flag}`;

  const job: InternalJob = {
    id: jobId,
    provider,
    status: "starting",
    startedAt: Date.now(),
    expiresAt: Date.now() + JOB_TIMEOUT_MS,
    terminalCommand,
    rawLogs: [],
  };

  if (!binaryPath || !fsSync.existsSync(binaryPath)) {
    job.status = "failed";
    job.error = "CLIProxyAPI 未安装。请先在服务面板中安装 CLIProxyAPI。";
    jobs.set(jobId, job);
    return sanitizeJob(job);
  }

  job.timeoutTimer = setTimeout(() => {
    if (job.status === "starting" || job.status === "awaiting_user") {
      job.status = "timeout";
      job.error = "登录流程已超时（5 分钟未完成）。请重试。";
      try {
        job.child?.kill("SIGKILL");
      } catch {}
    }
  }, JOB_TIMEOUT_MS);

  try {
    const child = spawn(
      binaryPath,
      ["-config", configPath, providerMeta.flag],
      {
        cwd: configDir,
        env: {
          ...process.env,
          CLIPROXYAPI_AUTH_DIR: authDir,
          CLIPROXYAPI_CONFIG_DIR: configDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    job.child = child;

    const handleOutput = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      job.rawLogs.push(text);

      const parsed = extractOAuthUrlAndCode(text);
      if (parsed.authUrl) job.authUrl = parsed.authUrl;
      if (parsed.userCode) job.userCode = parsed.userCode;
      if (parsed.prompt) job.prompt = parsed.prompt;

      if (job.status === "starting" && (job.authUrl || job.userCode)) {
        job.status = "awaiting_user";
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.on("error", (err) => {
      if (job.status === "starting" || job.status === "awaiting_user") {
        job.status = "failed";
        job.error = sanitizeErrorMessage(err.message);
      }
    });

    child.on("exit", async (code) => {
      if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
      if (job.status === "canceled" || job.status === "timeout") return;

      if (code === 0) {
        job.status = "success";
        await autoImportCredentials().catch(() => {});
      } else {
        job.status = "failed";
        job.error = job.error || `进程已结束 (退出码: ${code})。${job.rawLogs.join("").slice(-200)}`;
      }
    });

    jobs.set(jobId, job);
    return sanitizeJob(job);
  } catch (err) {
    if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
    job.status = "failed";
    job.error = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    jobs.set(jobId, job);
    return sanitizeJob(job);
  }
}

export function getLoginJob(jobId: string): CliproxyLoginJob | null {
  const job = jobs.get(jobId);
  return job ? sanitizeJob(job) : null;
}

export function cancelLoginJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "starting" || job.status === "awaiting_user") {
    job.status = "canceled";
    if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
    try {
      job.child?.kill("SIGKILL");
    } catch {}
    return true;
  }
  return false;
}
