import { execFile } from "node:child_process";
import { createConnection } from "node:net";
import { promisify } from "node:util";

export const REDIS_CONTAINER_NAME =
  process.env.SHIGUANG_GATEWAY_REDIS_CONTAINER_NAME || "shiguangGateway-redis";
export const RUNTIME_PREFERENCE = ["podman", "docker"] as const;
export const REDIS_DEFAULT_BIND_HOST = "127.0.0.1";

type ExecFileAsync = (
  file: string,
  args: readonly string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile) as ExecFileAsync;

export function buildRedisPublishSpec(
  bindHost: string = REDIS_DEFAULT_BIND_HOST,
  hostPort: string | number = "6379",
): string {
  const host = String(bindHost || REDIS_DEFAULT_BIND_HOST).trim() || REDIS_DEFAULT_BIND_HOST;
  const port = String(hostPort || "6379").trim() || "6379";
  const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `${normalizedHost}:${port}:6379`;
}

export function buildRedisRunArgs(input: {
  bindHost: string;
  hostPort: string | number;
  image: string;
}): readonly string[] {
  return [
    "run",
    "-d",
    "--name",
    REDIS_CONTAINER_NAME,
    "-p",
    buildRedisPublishSpec(input.bindHost, input.hostPort),
    "--restart",
    "unless-stopped",
    input.image,
  ];
}

export async function detectRedisContainerRuntime(
  runCommand: ExecFileAsync = execFileAsync,
): Promise<string | null> {
  for (const candidate of RUNTIME_PREFERENCE) {
    try {
      await runCommand(candidate, ["--version"], { timeout: 3000 });
      return candidate;
    } catch {}
  }
  return null;
}

export async function runRedisRuntimeCommand(
  runtime: string,
  args: readonly string[],
  timeout: number,
  runCommand: ExecFileAsync = execFileAsync,
) {
  const { stdout, stderr } = await runCommand(runtime, args, { timeout });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function getRedisContainerState(runtime: string) {
  try {
    const { stdout } = await execFileAsync(runtime, [
      "ps",
      "-a",
      "--filter",
      `name=^${REDIS_CONTAINER_NAME}$`,
      "--format",
      "{{.Names}}\t{{.State}}",
    ], { timeout: 3000 });
    const trimmed = stdout.trim();
    if (!trimmed) return { exists: false, running: false };
    const [, state] = trimmed.split("\t");
    return { exists: true, running: state === "running" };
  } catch {
    return { exists: false, running: false };
  }
}

export function parseRedisUrl(url?: string): { host: string; port: number } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname || "127.0.0.1", port: Number(parsed.port) || 6379 };
  } catch {
    return null;
  }
}

export async function pingRedis(port: number | string, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port: Number(port), host });
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1500);
    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
