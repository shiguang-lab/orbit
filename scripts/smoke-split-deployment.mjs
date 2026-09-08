#!/usr/bin/env node

/** Local acceptance smoke for the split deployment surfaces. */
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const repoRoot = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const dataDir = await mkdtemp(join(tmpdir(), "orbit-split-smoke-"));
const baseEnv = {
  ...process.env,
  NODE_ENV: "production",
  JWT_SECRET: "split-smoke-jwt-secret-1234567890",
  API_KEY_SECRET: "split-smoke-api-secret-1234567890",
  STORAGE_ENCRYPTION_KEY: "split-smoke-storage-secret-1234567890",
  ORBIT_WORKER_COMMAND_TOKEN: "split-smoke-worker-command-token",
  DATA_DIR: dataDir,
  SQLITE_FILE: join(dataDir, "storage.sqlite"),
  ORBIT_ENABLE_LIVE_WS: "false",
  ORBIT_INTERNAL_SERVICE_TOKEN: "split-smoke-internal-service-token",
  LOG_LEVEL: "silent",
};
const services = [
  { name: "gateway", port: 18887, live: false },
  { name: "control", port: 18888, live: false },
  { name: "realtime", port: 18889, live: true },
];
const workerService = { name: "worker", port: 18891, live: false };
const children = [];
let clientApiHeaders = {};

const tunnelControllerSource = readFileSync(
  join(repoRoot, "apps/control/src/tunnels/tunnels.controller.ts"),
  "utf8",
);
if (!tunnelControllerSource.includes("encoder.encode(`event: ${event}\\ndata: ${JSON.stringify(payload)}\\n\\n`)")) {
  throw new Error("control tunnel install projection must emit valid SSE line breaks");
}

function appendOutput(service, chunk) {
  service.output = `${service.output}${chunk}`.slice(-8_000);
}

function assertServicesRunning() {
  const exited = children.filter(({ child }) => child.exitCode !== null);
  if (exited.length === 0) return;
  const details = exited
    .map(({ service, child }) => `${service.name} exited ${child.exitCode}\n${service.output.trim()}`)
    .join("\n\n");
  throw new Error(details);
}

function start(service) {
  const env = { ...baseEnv };
  if (service.name === "gateway") {
    env.EDGE_GATEWAY_PORT = String(service.port);
    env.EDGE_GATEWAY_HOST = "127.0.0.1";
    // Deliberately enable the legacy flag on an isolated port: edge must not
    // start a dashboard listener after realtime owns that responsibility.
    env.ORBIT_ENABLE_LIVE_WS = "true";
    env.LIVE_WS_PORT = "18991";
  } else if (service.name === "control") {
    env.CONTROL_API_PORT = String(service.port);
    env.CONTROL_API_HOST = "127.0.0.1";
    env.EDGE_GATEWAY_URL = "http://127.0.0.1:18887";
    env.ORBIT_WORKER_COMMAND_URL = "http://127.0.0.1:18891";
    env.EMBED_WS_PROXY_PORT = "18892";
  } else if (service.name === "worker") {
    env.WORKER_COMMAND_HOST = "127.0.0.1";
    env.WORKER_COMMAND_PORT = String(service.port);
    env.ORBIT_BASE_URL = "http://127.0.0.1:18887";
    env.INTERNAL_BASE_URL = "http://127.0.0.1:18887";
  } else {
    env.REALTIME_PORT = String(service.port);
    env.REALTIME_HOST = "127.0.0.1";
    env.ORBIT_ENABLE_LIVE_WS = "true";
    env.LIVE_WS_PORT = "18890";
    env.LIVE_WS_HOST = "127.0.0.1";
  }
  const child = spawn("pnpm", ["--filter", `@orbit/${service.name}`, "start"], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  service.output = "";
  child.stdout.on("data", (chunk) => appendOutput(service, chunk));
  child.stderr.on("data", (chunk) => appendOutput(service, chunk));
  children.push({ child, service });
}

async function waitHttp(port, path, expected = 200, method = "GET", headers) {
  headers ??= port === 18887 && /^(\/api)?\/v1\//.test(path) && expected !== 401 ? clientApiHeaders : {};
  const deadline = Date.now() + 45_000;
  let last = "";
  while (Date.now() < deadline) {
    assertServicesRunning();
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers });
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
    assertServicesRunning();
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
  // Match compose startup ordering: edge completes schema migration before
  // the remaining deployables open the shared database.
  start(services[0]);
  await waitHttp(18887, "/healthz");
  await waitHttp(18887, "/readyz");
  services.slice(1).forEach(start);
  start(workerService);
  await waitHttp(18891, "/internal/jobs/commands/v1", 401, "POST");
  const authenticatedJobCommand = await fetch("http://127.0.0.1:18891/internal/jobs/commands/v1", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-orbit-worker-command-token": baseEnv.ORBIT_WORKER_COMMAND_TOKEN,
    },
    body: JSON.stringify({ version: 1, command: "run-now", jobId: "missing-split-smoke-job" }),
  });
  if (authenticatedJobCommand.status !== 404) {
    throw new Error(`authenticated worker job command returned ${authenticatedJobCommand.status}`);
  }
  await waitHttp(18887, "/api/internal/tunnels/command", 401, "POST");
  const tunnelStatus = await fetch("http://127.0.0.1:18887/api/internal/tunnels/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-orbit-internal-service-token": baseEnv.ORBIT_INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({ version: 1, command: "ngrok.status" }),
  });
  if (!tunnelStatus.ok) {
    const edgeOutput = services.find((service) => service.name === "gateway")?.output ?? "";
    throw new Error(
      `authenticated edge tunnel command failed: ${tunnelStatus.status} ${await tunnelStatus.text()}\n${edgeOutput}`,
    );
  }
  await waitHttp(18887, "/.well-known/agent.json");
  // Use an actual scoped credential in the isolated smoke database. The
  // model catalog must not inherit anonymous management bootstrap access.
  const credentialFile = join(dataDir, "smoke-api-key");
  const provision = spawnSync("pnpm", ["--filter", "@orbit/control", "exec", "node", "--import", "tsx", "--input-type=module", "--eval", `
    import { writeFileSync } from "node:fs";
    import { createApiKey } from "@orbit/core/db/api-keys";
    createApiKey("split-smoke", "split-smoke", ["read"]).then(async key => {
      writeFileSync(${JSON.stringify(credentialFile)}, key.key, {mode: 0o600});
      const management = await createApiKey("split-smoke-management", "split-smoke", ["manage"]);
      writeFileSync(${JSON.stringify(credentialFile + "-management")}, management.key, {mode: 0o600});
    });
  `], { cwd: repoRoot, env: baseEnv, encoding: "utf8", timeout: 30000 });
  if (provision.status !== 0) throw new Error(`smoke credential setup failed: ${provision.stderr}`);
  const catalogHeaders = clientApiHeaders = { authorization: `Bearer ${readFileSync(credentialFile, "utf8")}` };
  const managementHeaders = { authorization: `Bearer ${readFileSync(credentialFile + "-management", "utf8")}` };
  await waitHttp(18888, "/api/cloud-agents/tasks", 401);
  await waitHttp(18888, "/api/cloud-agents/tasks", 403, "GET", catalogHeaders);
  await waitHttp(18888, "/api/cloud-agents/tasks?limit=100", 200, "GET", managementHeaders);
  const cloudTasks = await fetch("http://127.0.0.1:18888/api/cloud-agents/tasks?limit=100", { headers: managementHeaders }).then(response => response.json());
  if (!Array.isArray(cloudTasks.data)) throw new Error("Cloud agent management response must contain task data");
  await waitHttp(18888, "/api/openapi/spec", 200, "GET", managementHeaders);
  const openapi = await fetch("http://127.0.0.1:18888/api/openapi/spec", { headers: managementHeaders }).then(response => response.json());
  if (!openapi.endpoints?.some(endpoint => endpoint.path === "/api/v1/multimodal-embeddings" && endpoint.method === "POST")) {
    throw new Error("OpenAPI catalog is missing the multimodal embeddings operation");
  }
  // Exercise proxy edits only in the isolated smoke database.
  const proxyUrl = "http://127.0.0.1:18888/api/settings/proxy";
  const providerProxy = { type: "http", host: "127.0.0.1", port: 18081 };
  const globalProxy = { type: "socks5", host: "127.0.0.1", port: 18082 };
  for (const payload of [{ providers: { "smoke-provider": providerProxy } }, { global: globalProxy }, { global: null }]) {
    const response = await fetch(proxyUrl, { method: "PUT", headers: { ...managementHeaders, "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status !== 200) throw new Error(`Proxy configuration update failed: ${response.status}`);
    const stored = await fetch(proxyUrl, { headers: managementHeaders }).then(result => result.json());
    if (Object.hasOwn(payload, "global") && JSON.stringify(stored.global) !== JSON.stringify(payload.global)) throw new Error("Global proxy did not round-trip");
    if (JSON.stringify(stored.providers?.["smoke-provider"]) !== JSON.stringify(providerProxy)) throw new Error("Global proxy edit lost provider overrides");
  }
  await waitHttp(18888, "/api/search/analytics", 401);
  await waitHttp(18888, "/api/search/analytics", 403, "GET", catalogHeaders);
  await waitHttp(18888, "/api/search/analytics", 200, "GET", managementHeaders);
  await waitHttp(18887, "/api/v1/search/analytics", 404, "GET", managementHeaders);
  await waitHttp(18888, "/api/v1/search/analytics", 404, "GET", managementHeaders);
  await waitHttp(18888, "/api/providers/catalog", 401);
  await waitHttp(18888, "/api/providers/catalog", 403, "GET", catalogHeaders);
  for (const path of ["/api/providers", "/api/provider-nodes", "/api/providers/catalog"]) {
    await waitHttp(18888, path, 200, "GET", managementHeaders);
  }
  const providerCatalog = await fetch("http://127.0.0.1:18888/api/providers/catalog", { headers: managementHeaders }).then(response => response.json());
  const apiKeyProviders = providerCatalog.categories.find(category => category.key === "apikey")?.providers;
  if (!apiKeyProviders?.some(provider => provider.id === "openai" && provider.dashboardSection === "llm") ||
      !apiKeyProviders.some(provider => provider.id === "openrouter" && provider.dashboardSection === "aggregator")) {
    throw new Error("Provider catalog is missing registered providers or dashboard metadata");
  }
  await waitHttp(18887, "/api/v1/models", 401);
  await waitHttp(18887, "/api/v1/models", 200, "GET", catalogHeaders);
  await waitHttp(18887, "/v1/models", 200, "GET", catalogHeaders);
  // The voices route is edge-owned; with an empty smoke database it must
  // reach the real handler and report missing ElevenLabs credentials (401),
  // rather than being served by the control surface or a fallback route.
  await waitHttp(18887, "/api/v1/voices", 401, "GET", clientApiHeaders);
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
  await waitHttp(18888, "/api/auth/session", 401);
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
  // The control plane now reads the durable default `requireLogin: true`
  // setting during startup, so its auth boundary rejects these retired paths
  // before Nest's 404 handler. Static route ownership audits prove retirement;
  // the split smoke verifies unauthenticated callers cannot reach them.
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
  for (const { child } of children) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  }
  await rm(dataDir, { recursive: true, force: true });
}
