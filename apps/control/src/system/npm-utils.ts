import { execFile } from "node:child_process";

/** Version/tag syntax accepted by the control-plane update workflow. */
export const SERVICE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

export interface NpmExecOptions {
  cwd?: string;
  timeout: number;
  env: NodeJS.ProcessEnv;
  maxBuffer: number;
  shell?: boolean;
  windowsHide: boolean;
}

/**
 * Build safe execFile options for npm. Windows exposes npm as npm.cmd and
 * requires a shell on recent Node versions; all runtime values remain in env
 * rather than being interpolated into a shell command.
 */
export function buildNpmExecOptions(
  platform: NodeJS.Platform,
  options: { cwd?: string; timeoutMs: number; prefix?: string },
): NpmExecOptions {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (options.prefix) env.npm_config_prefix = options.prefix;
  const result: NpmExecOptions = {
    cwd: options.cwd,
    timeout: options.timeoutMs,
    env,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  };
  if (platform === "win32") result.shell = true;
  return result;
}

/** Execute npm with argv kept separate from user-controlled values. */
export function runNpm(
  args: string[],
  options: { cwd?: string; timeoutMs?: number; prefix?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
  return new Promise((resolve, reject) => {
    execFile(
      npmBin,
      args,
      buildNpmExecOptions(process.platform, {
        cwd: options.cwd,
        timeoutMs: options.timeoutMs ?? 300_000,
        prefix: options.prefix,
      }),
      (error, stdout, stderr) => {
        if (error) {
          Object.assign(error, { stdout: String(stdout), stderr: String(stderr) });
          reject(error);
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}
