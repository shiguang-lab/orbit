#!/usr/bin/env node

/** Start the local edge plus worker and verify every scheduler module loads. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function waitForClose(closed, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    closed.then(() => {
      clearTimeout(timer);
      resolve(true);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

/** Reap pnpm and close the pipes inherited by its entire service process tree. */
export async function stopProcessGroup({ child, closed }, {
  termTimeoutMs = 3_000,
  killTimeoutMs = 2_000,
} = {}) {
  if (child.pid) {
    signalProcessGroup(child.pid, "SIGTERM");
    await waitForClose(closed, termTimeoutMs);
    // pnpm can exit before its descendants. Check the group even when its
    // close event has fired, and kill any remaining scheduler/CLI processes.
    if (signalProcessGroup(child.pid, 0)) {
      signalProcessGroup(child.pid, "SIGKILL");
    }
  }
  // 'exit' only covers pnpm. 'close' also waits for inherited stdout/stderr,
  // which is the handle that kept this smoke alive after its PASS message.
  if (!await waitForClose(closed, killTimeoutMs)) {
    throw new Error(`service process group ${child.pid ?? "(not spawned)"} did not close after termination`);
  }
}

async function main() {
  const dataDir = await mkdtemp(join(tmpdir(), "shiguangGateway-worker-smoke-"));
  const baseEnv = {
    ...process.env,
    NODE_ENV: "production",
    JWT_SECRET: "worker-smoke-jwt-secret-1234567890",
    API_KEY_SECRET: "worker-smoke-api-secret-1234567890",
    STORAGE_ENCRYPTION_KEY: "worker-smoke-storage-secret-1234567890",
    DATA_DIR: dataDir,
    SQLITE_FILE: join(dataDir, "storage.sqlite"),
    EDGE_GATEWAY_HOST: "127.0.0.1",
    EDGE_GATEWAY_PORT: "18897",
    SHIGUANG_GATEWAY_BASE_URL: "http://127.0.0.1:18897",
    INTERNAL_BASE_URL: "http://127.0.0.1:18897",
    // Exercise the real scheduler start paths. The empty test database contains
    // no provider credentials, so no upstream request can be issued.
    SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES: "0",
    SHIGUANG_GATEWAY_ENABLE_RUNTIME_BACKGROUND_TASKS: "1",
    SHIGUANG_GATEWAY_ENABLE_LIVE_WS: "false",
    LOG_LEVEL: "silent",
  };
  const children = [];
  const output = [];
  const abortController = new AbortController();
  const onInterrupt = () => abortController.abort(new Error("worker smoke interrupted by SIGINT"));
  const onTerminate = () => abortController.abort(new Error("worker smoke interrupted by SIGTERM"));
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);

  function start(filter) {
    const child = spawn("pnpm", ["--filter", `@shiguang-gateway/${filter}`, "start"], {
      cwd: repoRoot,
      env: { ...baseEnv, APP_NAME: filter },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    const service = { child, closed: null, didClose: false, error: null, name: filter };
    service.closed = new Promise((resolve) => {
      child.once("error", (error) => { service.error = error; });
      child.once("close", () => { service.didClose = true; resolve(); });
    });
    child.stdout.on("data", (chunk) => output.push(String(chunk)));
    child.stderr.on("data", (chunk) => output.push(String(chunk)));
    children.push(service);
    return service;
  }

  function assertRunning(service) {
    abortController.signal.throwIfAborted();
    if (service.error) throw service.error;
    if (service.didClose) throw new Error(`${service.name} exited before startup completed: ${output.join("").slice(-4000)}`);
  }

  async function waitHttp(edge) {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      assertRunning(edge);
      try {
        const response = await fetch("http://127.0.0.1:18897/healthz", {
          signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(1_000)]),
        });
        await response.body?.cancel();
        if (response.ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error("edge did not become healthy");
  }

  let failure;
  try {
    const edge = start("edge-gateway");
    await waitHttp(edge);
    const worker = start("worker");
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !output.join("").includes("[worker] started:")) {
      assertRunning(edge);
      assertRunning(worker);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assertRunning(edge);
    assertRunning(worker);
    const logs = output.join("");
    if (!logs.includes("[worker] started:")) throw new Error("worker startup marker missing");
    const marker = logs.match(/\[worker\] started: (.*)/)?.[1] ?? "";
    const expected = [
      "cloud-sync-and-job-registry", "quota-cache-refresh", "spend-batch-writer",
      "quota-auto-ping", "connection-recovery", "radar-sync",
      "models-dev-sync", "pricing-sync", "cleanup", "warmup", "provider-limits",
      "subscription", "session-affinity-cleanup", "credential-health", "vacuum-scheduler",
      "audit-log", "audit-log-retention", "memory-backends", "conductor-bridge", "arena-elo-sync",
      "openrouter-provider-stats", "context-window-reconcile", "memory-decay",
      "runtime-config-hot-reload", "reasoning-cache-cleanup", "backup-schedule", "proxy-health", "free-proxy-auto-sync",
      "batch-processor", "auto-refresh-daemon",
    ];
    const missing = expected.filter((name) => !marker.includes(name));
    if (missing.length) throw new Error(`worker startup omitted modules: ${missing.join(", ")}`);
    if (/failed to start|ECONNREFUSED|ProxyFetch|100\.87\.115\.78|model\.publib\.cn/i.test(logs)) {
      throw new Error(`worker startup contains failure or retired endpoint: ${logs.slice(-4000)}`);
    }
  } catch (error) {
    failure = error;
  } finally {
    const results = await Promise.allSettled(children.map((service) => stopProcessGroup(service)));
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    const cleanupErrors = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    if (cleanupErrors.length) {
      throw new AggregateError(failure ? [failure, ...cleanupErrors] : cleanupErrors, `worker smoke cleanup failed; data retained at ${dataDir}`);
    }
    await rm(dataDir, { recursive: true, force: true });
  }
  if (failure) throw failure;
  console.log("worker startup smoke: PASS (all scheduler modules loaded and started; local base URL only; child processes closed)");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
