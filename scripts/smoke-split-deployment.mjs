#!/usr/bin/env node

/** Local acceptance smoke for the split deployment surfaces. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const repoRoot = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const dataDir = await mkdtemp(join(tmpdir(), "shiguangGateway-split-smoke-"));
const baseEnv = {
  ...process.env,
  NODE_ENV: "production",
  JWT_SECRET: "split-smoke-jwt-secret-1234567890",
  API_KEY_SECRET: "split-smoke-api-secret-1234567890",
  DATA_DIR: dataDir,
  SQLITE_FILE: join(dataDir, "storage.sqlite"),
  SHIGUANG_GATEWAY_ENABLE_LIVE_WS: "false",
  LOG_LEVEL: "silent",
};
const services = [
  { name: "edge-gateway", port: 18887, live: false },
  { name: "control-api", port: 18888, live: false },
  { name: "realtime", port: 18889, live: true },
];
const children = [];

function start(service) {
  const env = { ...baseEnv };
  if (service.name === "edge-gateway") {
    env.EDGE_GATEWAY_PORT = String(service.port);
    env.EDGE_GATEWAY_HOST = "127.0.0.1";
  } else if (service.name === "control-api") {
    env.CONTROL_API_PORT = String(service.port);
    env.CONTROL_API_HOST = "127.0.0.1";
  } else {
    env.REALTIME_PORT = String(service.port);
    env.REALTIME_HOST = "127.0.0.1";
    env.LIVE_WS_PORT = "18890";
    env.LIVE_WS_HOST = "127.0.0.1";
  }
  const child = spawn("pnpm", ["--filter", `@shiguang-gateway/${service.name}`, "start"], {
    cwd: repoRoot,
    env,
    stdio: "ignore",
    detached: true,
  });
  children.push(child);
}

async function waitHttp(port, path, expected = 200) {
  const deadline = Date.now() + 45_000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.status === expected) return;
      last = `${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`timeout waiting for ${port}${path}; last=${last}`);
}

async function waitTcp(port) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: "127.0.0.1", port }, resolve);
        socket.once("error", reject);
        socket.setTimeout(500, () => reject(new Error("timeout")));
        socket.once("connect", () => socket.destroy());
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`timeout waiting for TCP ${port}`);
}

try {
  services.forEach(start);
  await waitHttp(18887, "/healthz");
  await waitHttp(18887, "/readyz");
  await waitHttp(18887, "/.well-known/agent.json");
  await waitHttp(18887, "/api/v1/models");
  await waitHttp(18887, "/v1/models");
  await waitHttp(18887, "/api/providers", 404);
  await waitHttp(18888, "/healthz");
  await waitHttp(18888, "/api/v1/models", 404);
  await waitHttp(18888, "/v1/models", 404);
  await waitHttp(18889, "/healthz");
  await waitTcp(18890);
  console.log("split deployment smoke: PASS (edge, control, realtime, live WS)");
} finally {
  for (const child of children) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  }
  await rm(dataDir, { recursive: true, force: true });
}
