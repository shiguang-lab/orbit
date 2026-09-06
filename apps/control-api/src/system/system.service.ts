/**
 * GET  /api/system/version  — Returns current version and latest available on npm
 * POST /api/system/version  — Triggers a deployment-aware background update
 *
 * Security: Requires admin authentication (same as other management routes).
 * Safety: Update only runs if a newer version is available on npm.
 */
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  ensureGitTagExists,
  getAutoUpdateConfig,
  launchAutoUpdate,
  validateAutoUpdateRuntime,
  PROJECT_ROOT,
} from "./auto-update.js";
import { NEWS_JSON_URL, parseActiveNewsPayload } from "./release-notes.js";
import {
  clearLatestVersionCache,
  isNewer,
  resolveLatestVersionCached,
} from "./version-check.js";
import { resolveGlobalShiguangGatewayPath } from "./global-package-path.js";
import { restartRunningServer } from "./process-manager-restart.js";
// #5542 — On Windows npm is `npm.cmd`; Node ≥24 refuses to execFile a `.cmd` without
// a shell (nodejs/node#52554 → "spawn npm ENOENT"). buildNpmExecOptions enables the
// shell on win32 only; SERVICE_VERSION_PATTERN keeps the shell-joined version safe.
import { buildNpmExecOptions, SERVICE_VERSION_PATTERN } from "./npm-utils.js";
import {
  GET as getEnvRepair,
  POST as repairEnv,
} from "./handlers/env-repair.handler.js";

const execFileAsync = promisify(execFile);

export type SystemResult = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
};

function jsonResult(body: unknown, status = 200, headers: Record<string, string> = {}): SystemResult {
  return { status, headers: { "content-type": "application/json", ...headers }, body };
}

function getCurrentVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const entry = require.resolve("@shiguang-gateway/core-domain/startup");
    const packageRoot = entry.slice(0, entry.lastIndexOf("/src/"));
    return require(`${packageRoot}/package.json`).version as string;
  } catch {
    return "unknown";
  }
}

/**
 * Shared restart step for both npm-mode update flows (source-checkout and global-install
 * below). #11885: this used to hardcode `pm2 restart shiguangGateway` in each branch separately
 * and silently report "skipped" — reading like a completed update — whenever pm2 wasn't
 * the process manager. `restartRunningServer()` tries ShiguangGateway's own PID-file-managed
 * supervisor first, then pm2, and this wrapper turns its honest "restart-required" outcome
 * into an SSE step the dashboard renders as a warning instead of a false "done".
 */
async function sendRestartStep(send: (data: Record<string, unknown>) => void): Promise<void> {
  send({ step: "restart", status: "running", message: "Restarting service..." });
  const outcome = await restartRunningServer();
  send({ step: "restart", status: outcome.status, message: outcome.message });
}

async function getNews() {
  if (!NEWS_JSON_URL) return null;
  try {
    const res = await fetch(NEWS_JSON_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return parseActiveNewsPayload(data);
  } catch {
    return null;
  }
}

async function getVersion(headers: Headers): Promise<SystemResult> {
  const current = getCurrentVersion();
  const config = getAutoUpdateConfig();

  const [latest, news, validation] = await Promise.all([
    resolveLatestVersionCached({
      bypassCache: /(?:^|,)\s*(?:no-cache|no-store)\b/i.test(
        headers.get("Cache-Control") ?? ""
      ),
      storeResult: !/(?:^|,)\s*no-store\b/i.test(headers.get("Cache-Control") ?? ""),
    }),
    getNews(),
    validateAutoUpdateRuntime(config),
  ]);

  const body = {
    current,
    latest: latest ?? "unavailable",
    updateAvailable: isNewer(latest, current),
    channel: config.mode,
    autoUpdateSupported: validation.supported,
    autoUpdateError: validation.reason,
    news,
  };
  const serialized = JSON.stringify(body);
  const etag = `"${createHash("sha256").update(serialized).digest("base64url")}"`;
  const responseHeaders = { "Cache-Control": "private, no-cache, must-revalidate", ETag: etag };
  const validators = headers.get("If-None-Match")?.split(",").map((value) => value.trim());
  if (validators?.some((value) => value === etag || value === `W/${etag}`)) {
    return { status: 304, headers: responseHeaders };
  }
  return { status: 200, headers: { ...responseHeaders, "Content-Type": "application/json" }, body: serialized };
}

async function updateVersion(): Promise<SystemResult> {
  const current = getCurrentVersion();
  const latest = await resolveLatestVersionCached({ bypassCache: true });

  if (!latest) {
    return jsonResult({ success: false, error: "Could not reach npm registry" }, 503);
  }

  const resolvedTargetTag = latest.startsWith("v") ? latest : `v${latest}`;

  if (!isNewer(latest, current)) {
    return jsonResult({
      success: false,
      error: `Already on latest version (${current})`,
      current,
      latest,
    });
  }

  const config = getAutoUpdateConfig();
  const validation = await validateAutoUpdateRuntime(config);

  if (!validation.supported) {
    return jsonResult(
      {
        success: false,
        error: validation.reason || "Auto-update is not supported in this environment.",
      },
      400,
    );
  }

  // If we are in docker-compose mode, use the detached shell script background updates
  if (config.mode === "docker-compose") {
    const launched = await launchAutoUpdate({ latest });
    if (!launched.started) {
      return jsonResult(
        {
          success: false,
          error: launched.error || "Failed to start auto-update.",
          channel: launched.channel,
          logPath: launched.logPath,
        },
        503,
      );
    }

    clearLatestVersionCache();
    return jsonResult({
      success: true,
      message: `Update to v${latest} started. Docker rebuild is running in the background.`,
      from: current,
      to: latest,
      channel: launched.channel,
      logPath: launched.logPath,
    });
  }

  if (config.mode === "source") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({
            step: "install",
            status: "running",
            message: `Fetching latest tags from ${config.gitRemote}...`,
          });
          await execFileAsync("git", ["fetch", "--tags", config.gitRemote], {
            timeout: 60_000,
            cwd: PROJECT_ROOT,
          });
          send({ step: "install", status: "done", message: "Tags fetched" });

          send({
            step: "install",
            status: "running",
            message: `Validating ${resolvedTargetTag}...`,
          });
          await ensureGitTagExists(resolvedTargetTag, execFileAsync, PROJECT_ROOT);
          send({
            step: "install",
            status: "done",
            message: `Validated ${resolvedTargetTag}`,
          });

          send({
            step: "install",
            status: "running",
            message: `Checking out ${resolvedTargetTag}...`,
          });
          try {
            await execFileAsync("git", ["stash", "--include-untracked"], {
              timeout: 30_000,
              cwd: PROJECT_ROOT,
            });
          } catch {
            // No local changes to stash.
          }

          const shortHead = (
            await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
              timeout: 10_000,
              cwd: PROJECT_ROOT,
            })
          ).stdout.trim();
          const backupBranch = `pre-update/${shortHead}-${new Date().toISOString().replace(/[:.]/g, "-")}`;

          try {
            await execFileAsync("git", ["branch", backupBranch], {
              timeout: 10_000,
              cwd: PROJECT_ROOT,
            });
          } catch {
            // Backup branch is best-effort only.
          }

          await execFileAsync("git", ["checkout", resolvedTargetTag], {
            timeout: 30_000,
            cwd: PROJECT_ROOT,
          });
          send({ step: "install", status: "done", message: `Checked out ${resolvedTargetTag}` });

          send({
            step: "rebuild",
            status: "running",
            message: "Installing dependencies...",
          });
          await execFileAsync(
            "npm",
            ["install", "--legacy-peer-deps"],
            buildNpmExecOptions(process.platform, { cwd: PROJECT_ROOT, timeoutMs: 300_000 })
          );
          send({ step: "rebuild", status: "done", message: "Dependencies installed" });

          try {
            await execFileAsync("node", ["packages/core-domain/scripts/dev/sync-env.mjs"], {
              timeout: 15_000,
              cwd: PROJECT_ROOT,
            });
          } catch {
            // .env sync is non-fatal during update.
          }

          send({
            step: "rebuild",
            status: "running",
            message: "Building application...",
          });
          await execFileAsync(
            "npm",
            ["run", "build"],
            buildNpmExecOptions(process.platform, { cwd: PROJECT_ROOT, timeoutMs: 600_000 })
          );
          send({ step: "rebuild", status: "done", message: "Build complete" });

          await sendRestartStep(send);

          send({
            step: "complete",
            status: "done",
            from: current,
            to: latest,
            message: `Update to ${resolvedTargetTag} complete!`,
          });
          console.log(`[AutoUpdate] Successfully updated to ${resolvedTargetTag} via source mode`);
        } catch (err: any) {
          const errMsg = err?.stderr || err?.message || String(err);
          send({ step: "error", status: "failed", message: errMsg });
          console.error("[AutoUpdate] Source update failed:", err);
        } finally {
          controller.close();
        }
      },
    });

    return { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }, body: stream };
  }

  // Stream progress events so the frontend can show real-time status for NPM/PM2 mode
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Install
        // #5542 — buildNpmExecOptions enables the shell on win32 (npm.cmd), which
        // shell-joins argv, so the version spec must be metacharacter-free before it
        // reaches the command line (Hard Rule #13).
        if (!SERVICE_VERSION_PATTERN.test(latest)) {
          send({ step: "install", status: "error", message: "Invalid version format" });
          controller.close();
          return;
        }
        send({ step: "install", status: "running", message: `Installing shiguangGateway@${latest}...` });
          await execFileAsync(
            "npm",
            ["install", "-g", `shiguangGateway@${latest}`, "--ignore-scripts", "--legacy-peer-deps"],
            buildNpmExecOptions(process.platform, { cwd: PROJECT_ROOT, timeoutMs: 300_000 })
          );
        send({ step: "install", status: "done", message: `Installed shiguangGateway@${latest}` });

        // Step 2: Rebuild native modules (critical for better-sqlite3)
        send({
          step: "rebuild",
          status: "running",
          message: "Rebuilding native modules (better-sqlite3)...",
        });
        const omniPath = await resolveGlobalShiguangGatewayPath();
        await execFileAsync(
          "npm",
          ["rebuild", "better-sqlite3"],
          buildNpmExecOptions(process.platform, { cwd: omniPath, timeoutMs: 120_000 })
        );
        send({ step: "rebuild", status: "done", message: "Native modules rebuilt" });

        // Step 3: Restart
        await sendRestartStep(send);

        clearLatestVersionCache();
        send({
          step: "complete",
          status: "done",
          from: current,
          to: latest,
          message: `Update to v${latest} complete!`,
        });
        console.log(`[AutoUpdate] Successfully updated to v${latest}`);
      } catch (err: any) {
        const errMsg = err?.stderr || err?.message || String(err);
        send({ step: "error", status: "failed", message: errMsg });
        console.error(`[AutoUpdate] Update failed:`, err);
      } finally {
        controller.close();
      }
    },
  });

  return { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }, body: stream };
}

/** Control-plane provider for update/version operations. */
@Injectable()
export class SystemService {
  getEnvRepair(request: Request) {
    return getEnvRepair(request);
  }

  repairEnv(request: Request) {
    return repairEnv(request);
  }

  getVersion(headers: Headers): Promise<SystemResult> {
    return getVersion(headers);
  }

  updateVersion(): Promise<SystemResult> {
    return updateVersion();
  }
}
