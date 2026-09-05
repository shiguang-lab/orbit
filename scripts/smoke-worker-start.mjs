#!/usr/bin/env node

/** Start the local edge plus worker and verify every scheduler module loads. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
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

function start(filter) {
  const child = spawn("pnpm", ["--filter", `@shiguang-gateway/${filter}`, "start"], {
    cwd: repoRoot,
    env: { ...baseEnv, APP_NAME: filter },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));
  children.push(child);
  return child;
}

async function waitHttp() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:18897/healthz");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("edge did not become healthy");
}

try {
  start("edge-gateway");
  await waitHttp();
  start("worker");
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline && !output.join("").includes("[worker] started:")) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const logs = output.join("");
  if (!logs.includes("[worker] started:")) throw new Error("worker startup marker missing");
  const marker = logs.match(/\[worker\] started: (.*)/)?.[1] ?? "";
  const expected = [
    "cloud-sync-and-job-registry", "quota-cache-refresh", "spend-batch-writer",
    "quota-auto-ping", "connection-recovery", "radar-sync", "embedded-services",
    "models-dev-sync", "pricing-sync", "cleanup", "warmup", "provider-limits",
    "subscription", "session-affinity-cleanup", "credential-health", "vacuum-scheduler",
    "audit-log", "audit-log-retention", "memory-backends", "embed-ws-proxy", "conductor-bridge", "arena-elo-sync",
    "openrouter-provider-stats", "context-window-reconcile", "memory-decay",
    "runtime-config-hot-reload", "reasoning-cache-cleanup", "backup-schedule", "proxy-health", "free-proxy-auto-sync",
    "batch-processor", "auto-refresh-daemon",
  ];
  const missing = expected.filter((name) => !marker.includes(name));
  if (missing.length) throw new Error(`worker startup omitted modules: ${missing.join(", ")}`);
  if (/failed to start|ECONNREFUSED|ProxyFetch|100\.87\.115\.78|model\.publib\.cn/i.test(logs)) {
    throw new Error(`worker startup contains failure or retired endpoint: ${logs.slice(-4000)}`);
  }
  console.log("worker startup smoke: PASS (all scheduler modules loaded and started; local base URL only)");
} finally {
  for (const child of children) {
    try { child.kill("SIGTERM"); } catch {}
  }
  await rm(dataDir, { recursive: true, force: true });
}
