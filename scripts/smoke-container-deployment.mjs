#!/usr/bin/env node

/**
 * Acceptance smoke for a running independent Docker deployment.
 *
 * The compose stack must already be running. This script verifies the imported
 * database, native SQLite/vector support, surface isolation, protocol APIs,
 * realtime port, worker schedulers, and startup logs. It never prints secrets.
 */
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { spawnSync } from "node:child_process";
import process from "node:process";
import path from "node:path";

const sourceDir = process.env.SHIGUANG_GATEWAY_SOURCE_DATA_DIR;
if (!sourceDir) {
  console.error("SHIGUANG_GATEWAY_SOURCE_DATA_DIR is required");
  process.exit(2);
}
const sourceHomeDir = process.env.SHIGUANG_GATEWAY_SOURCE_HOME_DIR;

const edgePort = Number(process.env.SHIGUANG_GATEWAY_EDGE_PORT ?? 8787);
const controlPort = Number(process.env.SHIGUANG_GATEWAY_CONTROL_PORT ?? 8788);
const realtimePort = Number(process.env.SHIGUANG_GATEWAY_REALTIME_PORT ?? 8790);
const liveWsPort = Number(process.env.SHIGUANG_GATEWAY_LIVE_WS_PORT ?? 20132);
const containers = {
  edge: process.env.SHIGUANG_GATEWAY_EDGE_CONTAINER ?? "shiguang-gateway-edge",
  control: process.env.SHIGUANG_GATEWAY_CONTROL_CONTAINER ?? "shiguang-gateway-control",
  realtime: process.env.SHIGUANG_GATEWAY_REALTIME_CONTAINER ?? "shiguang-gateway-realtime",
  worker: process.env.SHIGUANG_GATEWAY_WORKER_CONTAINER ?? "shiguang-gateway-worker",
};

function docker(container, args) {
  const result = spawnSync("docker", ["exec", container, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`docker exec ${container} failed: ${(result.stderr || result.stdout || "").trim().slice(-2000)}`);
  }
  return result.stdout;
}

function dockerLogs(container) {
  const result = spawnSync("docker", ["logs", "--since", "10m", container], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`docker logs ${container} failed`);
  return `${result.stdout}\n${result.stderr}`;
}

async function waitHttp(port, route, expected = 200, headers = {}) {
  const deadline = Date.now() + 45_000;
  let last = "fetch failed";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { headers });
      if (response.status === expected) return response;
      last = String(response.status);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`timeout waiting for ${port}${route} (${expected}); last=${last}`);
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

function readActiveApiKey() {
  const db = new DatabaseSync(path.join(sourceDir, "storage.sqlite"), { readOnly: true });
  try {
    // Control-plane probes require a management-scoped key. A real NAS
    // snapshot commonly has client-only keys listed first, so selecting the
    // oldest active key can produce false 403 failures.
    const row = db.prepare(`
      SELECT key FROM api_keys
      WHERE is_active = 1 AND (scopes LIKE '%"manage"%' OR scopes LIKE '%"admin"%')
      ORDER BY created_at DESC LIMIT 1
    `).get();
    if (typeof row?.key !== "string" || !row.key) throw new Error("source snapshot has no active management API key");
    return row.key;
  } finally {
    db.close();
  }
}

function assertJsonArray(payload, fields, label) {
  if (Array.isArray(payload)) return;
  if (fields.some((field) => Array.isArray(payload?.[field]))) return;
  throw new Error(`${label} returned no array payload`);
}

const apiKey = readActiveApiKey();
const auth = { authorization: `Bearer ${apiKey}` };
try {
  const healthRoutes = [
    [edgePort, "/healthz"], [edgePort, "/readyz"],
    [controlPort, "/healthz"], [controlPort, "/readyz"],
    [realtimePort, "/healthz"],
  ];
  for (const [port, route] of healthRoutes) await waitHttp(port, route);
  await waitTcp(liveWsPort);

  const agent = await waitHttp(edgePort, "/.well-known/agent.json");
  const agentPayload = await agent.json();
  if (!agentPayload || typeof agentPayload !== "object") throw new Error("agent card is not JSON");

  const models = await waitHttp(edgePort, "/v1/models", 200, auth);
  const modelsPayload = await models.json();
  if (!Array.isArray(modelsPayload?.data) || modelsPayload.data.length === 0) {
    throw new Error("edge /v1/models returned an empty migrated catalog");
  }

  // Surface isolation: client protocol paths stay on edge, management paths
  // stay on control, and unknown protocol paths never become the admin SPA.
  await waitHttp(edgePort, "/api/providers", 404, auth);
  await waitHttp(controlPort, "/api/v1/models", 404, auth);
  await waitHttp(controlPort, "/v1/models", 404, auth);

  const providers = await waitHttp(controlPort, "/api/providers", 200, auth);
  assertJsonArray(await providers.json(), ["connections", "providers", "data", "items"], "control providers");
  const pools = await waitHttp(controlPort, "/api/quota/pools", 200, auth);
  assertJsonArray(await pools.json(), ["pools", "items"], "control quota pools");
  const groups = await waitHttp(controlPort, "/api/quota/groups", 200, auth);
  assertJsonArray(await groups.json(), ["groups", "items"], "control quota groups");
  const evals = await waitHttp(controlPort, "/api/evals", 200, auth);
  const evalPayload = await evals.json();
  assertJsonArray(evalPayload, ["suites", "items"], "control evals");
  if (JSON.stringify(evalPayload).includes("Mock output")) throw new Error("eval response contains mock data");

  const native = docker(containers.edge, ["node", "-e", [
    "const Database=require('/app/packages/core-domain/node_modules/better-sqlite3');",
    "const db=new Database('/app/data/storage.sqlite',{readonly:true});",
    "if(db.prepare('pragma integrity_check').get().integrity_check!=='ok') process.exit(10);",
    "const vec=require('/app/packages/core-domain/node_modules/sqlite-vec'); vec.load(db);",
    "console.log(JSON.stringify({driver:'better-sqlite3',vector:true}));",
  ].join("")]);
  if (!native.includes('"driver":"better-sqlite3"') || !native.includes('"vector":true')) {
    throw new Error("container native SQLite/vector probe failed");
  }

  // The call-log detail writer runs in a Node worker thread.  Production uses
  // pnpm workspace links, so exercise the exact packaged path instead of only
  // checking that the main HTTP process is healthy.  This catches a missing
  // workspace-local tsx loader before a real request loses its artifact.
  const artifactProbe = JSON.parse(docker(containers.edge, [
    "node",
    "--import", "/app/packages/core-domain/node_modules/tsx/dist/loader.mjs",
    "--input-type=module",
    "-e",
    [
      "import { writeCallArtifactAsync } from './packages/core-domain/src/lib/usage/callLogArtifactWriter.ts';",
      "const a={schemaVersion:5,summary:{id:'container-artifact-smoke',timestamp:new Date().toISOString(),method:'POST',path:'/smoke',status:200,model:'smoke',requestedModel:null,provider:'smoke',account:'smoke',connectionId:null,duration:1,tokens:{in:0,out:0,cacheRead:null,cacheWrite:null,reasoning:null,compressed:null},requestType:null,sourceFormat:null,targetFormat:null,apiKeyId:null,apiKeyName:null,comboName:null,comboStepId:null,comboExecutionKey:null},requestBody:{ok:true},responseBody:{ok:true},error:null};",
      "const result=await writeCallArtifactAsync(a); if(!result) process.exit(1); console.log(JSON.stringify(result)); process.exit(0);",
    ].join(" "),
  ]).trim());
  if (!artifactProbe?.relPath || !Number(artifactProbe.sizeBytes)) {
    throw new Error("container call-log artifact worker probe failed");
  }
  docker(containers.edge, [
    "node", "-e",
    `require('node:fs').rmSync('/app/data/call_logs/${artifactProbe.relPath}',{force:true})`,
  ]);

  const counts = JSON.parse(docker(containers.edge, ["node", "-e", [
    "const Database=require('/app/packages/core-domain/node_modules/better-sqlite3');",
    "const db=new Database('/app/data/storage.sqlite',{readonly:true});",
    "const names=['provider_connections','api_keys','key_value','jobs','job_runs','a2a_tasks','webhooks'];",
    "const out=Object.fromEntries(names.map(n=>[n,db.prepare('select count(*) as n from '+n).get().n]));",
    "console.log(JSON.stringify(out)); db.close();",
  ].join("")]).trim());
  for (const table of ["provider_connections", "api_keys", "key_value", "jobs", "job_runs"]) {
    if (!(Number(counts[table]) > 0)) throw new Error(`imported table ${table} is empty`);
  }

  if (sourceHomeDir) {
    // The importer records every allowlisted external credential/profile path
    // in the data manifest. Verify the known source credential is present in
    // the shared runtime home when it exists, without printing its contents.
    const sourceCodexAuth = path.join(sourceHomeDir, ".codex", "auth.json");
    const sourceHasCodexAuth = await readFile(sourceCodexAuth).then(() => true).catch(() => false);
    if (sourceHasCodexAuth) {
      docker(containers.edge, ["node", "-e", "process.exit(require('node:fs').existsSync('/home/node/.codex/auth.json')?0:1)"]);
    }
  }

  const logs = Object.values(containers).map(dockerLogs).join("\n");
  for (const [surface, marker] of [
    ["edge-gateway", "[edge-gateway] request services initialized"],
    ["control-api", "[control-api] control runtime initialized"],
  ]) {
    if (!logs.includes(marker)) {
      throw new Error(`runtime initialization missing for ${surface}`);
    }
  }
  for (const forbidden of [
    "Corepack is about to download", "pnpm --filter", "Cannot find module 'better-sqlite3'",
    "Failed to decrypt credential", "failed to start",
  ]) {
    if (logs.includes(forbidden)) throw new Error(`container logs contain forbidden startup marker: ${forbidden}`);
  }
  // A real NAS snapshot can contain an auto-started embedded CLIProxyAPI
  // service. Its first health probe may race with worker startup, so a
  // transient connection refusal is not itself a failure; the required
  // condition is that the service eventually serves and synchronises models.
  const sourceDb = new DatabaseSync(path.join(sourceDir, "storage.sqlite"), { readOnly: true });
  const cliproxy = sourceDb.prepare("SELECT status, auto_start FROM version_manager WHERE tool = 'cliproxy'").get();
  sourceDb.close();
  if (cliproxy?.auto_start && cliproxy.status !== "not_installed" && !logs.includes("[ModelSync:cliproxy] synced")) {
    throw new Error("snapshot enables auto-started cliproxy but no successful embedded-service model sync was observed");
  }
  for (const scheduler of [
    "cloud-sync-and-job-registry", "quota-cache-refresh", "spend-batch-writer", "quota-auto-ping",
    "connection-recovery", "radar-sync", "embedded-services", "models-dev-sync", "pricing-sync",
    "cleanup", "warmup", "provider-limits", "subscription", "session-affinity-cleanup",
    "credential-health", "vacuum-scheduler", "audit-log", "audit-log-retention", "embed-ws-proxy",
    "conductor-bridge", "arena-elo-sync", "openrouter-provider-stats", "context-window-reconcile",
    "memory-decay", "runtime-config-hot-reload", "reasoning-cache-cleanup", "backup-schedule", "proxy-health",
    "free-proxy-auto-sync", "batch-processor", "auto-refresh-daemon",
  ]) {
    if (!logs.includes(scheduler)) throw new Error(`worker scheduler missing from startup log: ${scheduler}`);
  }

  console.log(`container deployment smoke: PASS (models=${modelsPayload.data.length}, tables=${JSON.stringify(counts)}, native=better-sqlite3+sqlite-vec)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
