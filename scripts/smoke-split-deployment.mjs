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
    // Deliberately enable the legacy flag on an isolated port: edge must not
    // start a dashboard listener after realtime owns that responsibility.
    env.SHIGUANG_GATEWAY_ENABLE_LIVE_WS = "true";
    env.LIVE_WS_PORT = "18991";
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

async function waitHttp(port, path, expected = 200, method = "GET") {
  const deadline = Date.now() + 45_000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
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

async function assertTcpClosed(port) {
  try {
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
        socket.destroy();
        reject(new Error(`unexpected listener on ${port}`));
      });
      socket.once("error", resolve);
      socket.setTimeout(500, () => {
        socket.destroy();
        resolve();
      });
    });
  } catch (error) {
    throw error;
  }
}

try {
  services.forEach(start);
  await waitHttp(18887, "/healthz");
  await waitHttp(18887, "/readyz");
  await waitHttp(18887, "/.well-known/agent.json");
  await waitHttp(18887, "/api/v1/models");
  await waitHttp(18887, "/v1/models");
  // The voices route is edge-owned; with an empty smoke database it must
  // reach the real handler and report missing ElevenLabs credentials (401),
  // rather than being served by the control surface or a fallback route.
  await waitHttp(18887, "/api/v1/voices", 401);
  // GET is intentionally unsupported; a 405 confirms the edge route is
  // present without making an upstream ElevenLabs call.
  await waitHttp(18887, "/api/v1/speech-to-text", 405);
  await waitHttp(18887, "/api/v1/moderations", 405);
  await waitHttp(18887, "/api/v1/rerank", 405);
  await waitHttp(18887, "/api/v1/embeddings");
  await waitHttp(18887, "/api/v1/text-to-speech/test-voice", 405);
  await waitHttp(18887, "/api/v1/audio/transcriptions", 405);
  await waitHttp(18887, "/api/v1/audio/speech", 405);
  await waitHttp(18887, "/api/v1/audio/translations", 405);
  await waitHttp(18887, "/api/v1/images/edits", 405);
  await waitHttp(18887, "/api/v1/images/generations");
  await waitHttp(18887, "/api/v1/images/upscale");
  await waitHttp(18887, "/api/v1/files");
  await waitHttp(18887, "/api/v1/files/smoke-file", 404);
  await waitHttp(18887, "/api/v1/files/smoke-file/content", 404);
  await waitHttp(18887, "/api/v1/batches");
  await waitHttp(18887, "/api/v1/batches/smoke-batch", 404);
  await waitHttp(18887, "/api/v1/batches/smoke-batch/cancel", 405);
  await waitHttp(18887, "/api/v1/batches/delete-completed", 405);
  await waitHttp(18887, "/api/health", 404);
  await waitHttp(18887, "/api/providers", 404);
  await waitHttp(18888, "/healthz");
  await waitHttp(18888, "/api/health");
  await waitHttp(18888, "/api/health/ping");
  await waitHttp(18888, "/api/health/degradation");
  await waitHttp(18888, "/api/auth/status");
  await waitHttp(18888, "/api/token-health", 401);
  await waitHttp(18887, "/api/token-health", 404);
  await waitHttp(18888, "/api/synced-available-models", 401);
  await waitHttp(18887, "/api/synced-available-models", 404);
  await waitHttp(18888, "/api/provider-stats", 401);
  await waitHttp(18888, "/api/provider-metrics", 401);
  await waitHttp(18887, "/api/provider-stats", 404);
  await waitHttp(18888, "/api/provider-nodes", 401);
  await waitHttp(18887, "/api/provider-nodes", 404);
  await waitHttp(18888, "/api/provider-nodes/test-node", 401, "PUT");
  await waitHttp(18887, "/api/provider-nodes/test-node", 404, "PUT");
  await waitHttp(18888, "/api/provider-models", 401);
  await waitHttp(18887, "/api/provider-models", 404);
  await waitHttp(18888, "/api/provider-nodes/validate", 401, "POST");
  await waitHttp(18887, "/api/provider-nodes/validate", 404, "POST");
  await waitHttp(18888, "/api/keys", 401);
  await waitHttp(18887, "/api/keys", 404);
  await waitHttp(18888, "/api/keys/smoke-id", 401);
  await waitHttp(18887, "/api/keys/smoke-id", 404);
  await waitHttp(18888, "/api/keys/smoke-id/devices", 401);
  await waitHttp(18887, "/api/keys/smoke-id/devices", 404);
  await waitHttp(18888, "/api/keys/smoke-id/regenerate", 401, "POST");
  await waitHttp(18887, "/api/keys/smoke-id/regenerate", 404, "POST");
  await waitHttp(18888, "/api/keys/smoke-id/reveal", 401);
  await waitHttp(18887, "/api/keys/smoke-id/reveal", 404);
  await waitHttp(18888, "/api/keys/smoke-id/usage-limits", 401);
  await waitHttp(18887, "/api/keys/smoke-id/usage-limits", 404);
  await waitHttp(18888, "/api/keys/groups", 401);
  await waitHttp(18887, "/api/keys/groups", 404);
  await waitHttp(18888, "/api/keys/groups/smoke-group", 401);
  await waitHttp(18887, "/api/keys/groups/smoke-group", 404);
  await waitHttp(18888, "/api/keys/groups/smoke-group/keys", 401);
  await waitHttp(18887, "/api/keys/groups/smoke-group/keys", 404);
  await waitHttp(18888, "/api/keys/groups/smoke-group/permissions", 401);
  await waitHttp(18887, "/api/keys/groups/smoke-group/permissions", 404);
  await waitHttp(18888, "/api/gateway/status", 401);
  await waitHttp(18887, "/api/gateway/status", 404);
  await waitHttp(18888, "/api/shutdown", 401, "POST");
  await waitHttp(18888, "/api/restart", 401, "POST");
  await waitHttp(18887, "/api/shutdown", 404, "POST");
  await waitHttp(18887, "/api/restart", 404, "POST");
  await waitHttp(18888, "/api/v1/models", 404);
  await waitHttp(18888, "/api/v1/files", 404);
  await waitHttp(18888, "/api/v1/batches", 404);
  await waitHttp(18888, "/v1/models", 404);
  await waitHttp(18889, "/healthz");
  await waitTcp(18890);
  await assertTcpClosed(18991);
  console.log("split deployment smoke: PASS (edge, control, realtime, live WS)");
} finally {
  for (const child of children) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  }
  await rm(dataDir, { recursive: true, force: true });
}
