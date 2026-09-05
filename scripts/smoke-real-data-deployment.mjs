#!/usr/bin/env node

/** Import a supplied cold snapshot and exercise the independent data plane. */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const sourceDir = process.env.SHIGUANG_GATEWAY_SOURCE_DATA_DIR;
if (!sourceDir) {
  console.error("SHIGUANG_GATEWAY_SOURCE_DATA_DIR is required for the real-data deployment smoke");
  process.exit(2);
}
const repoRoot = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const dataDir = await mkdtemp(join(tmpdir(), "shiguangGateway-real-data-smoke-"));
let envText;
try {
  envText = await readFile(join(sourceDir, ".env"), "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  // NAS data volumes store the runtime encryption settings in server.env;
  // compose .env is deployment metadata and is not part of the cold snapshot.
  envText = await readFile(join(sourceDir, "server.env"), "utf8");
}
const sourceEnv = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const baseEnv = {
  ...process.env,
  ...sourceEnv,
  NODE_ENV: "production",
  DATA_DIR: dataDir,
  SQLITE_FILE: join(dataDir, "storage.sqlite"),
  EDGE_GATEWAY_HOST: "127.0.0.1",
  EDGE_GATEWAY_PORT: "18907",
  CONTROL_API_HOST: "127.0.0.1",
  CONTROL_API_PORT: "18908",
  SHIGUANG_GATEWAY_AUTH_MODE: "shiguang",
  SHIGUANG_GATEWAY_ENABLE_LIVE_WS: "false",
  LOG_LEVEL: "silent",
};
const children = [];

function run(command, args, env = baseEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} failed (${code})\n${output.slice(-4000)}`)));
  });
}

function start(filter) {
  const child = spawn("pnpm", ["--filter", `@shiguang-gateway/${filter}`, "start"], {
    cwd: repoRoot,
    env: { ...baseEnv, APP_NAME: filter },
    stdio: "ignore",
  });
  children.push(child);
}

async function waitHttp(port, path, expected = 200, headers = {}) {
  const deadline = Date.now() + 45_000;
  let last = "fetch failed";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
      if (response.status === expected) return response;
      last = String(response.status);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`timeout waiting for ${port}${path} (${expected}); last=${last}`);
}

try {
  await run("node", ["scripts/import-source-data.mjs", "--source-data-dir", sourceDir, "--target-data-dir", dataDir, "--replace"]);
  const db = new DatabaseSync(join(dataDir, "storage.sqlite"), { readOnly: true });
  const apiKey = db.prepare(`
    SELECT key FROM api_keys
    WHERE is_active = 1 AND (scopes LIKE '%"manage"%' OR scopes LIKE '%"admin"%')
    ORDER BY created_at DESC LIMIT 1
  `).get()?.key;
  db.close();
  if (typeof apiKey !== "string" || !apiKey) throw new Error("imported snapshot has no active management API key for authenticated smoke");
  const auth = { authorization: `Bearer ${apiKey}` };
  start("edge-gateway");
  start("control-api");
  await waitHttp(18907, "/healthz");
  await waitHttp(18908, "/healthz");
  await waitHttp(18907, "/.well-known/agent.json");
  const models = await waitHttp(18907, "/v1/models", 200, auth);
  const payload = await models.json();
  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    throw new Error("migrated data plane returned an empty /v1/models catalog");
  }
  const providers = await waitHttp(18908, "/api/providers", 200, auth);
  const providerPayload = await providers.json();
  if (!Array.isArray(providerPayload?.providers) && !Array.isArray(providerPayload?.connections) &&
      !Array.isArray(providerPayload?.data) &&
      !Array.isArray(providerPayload?.items) && !Array.isArray(providerPayload)) {
    const keys = providerPayload && typeof providerPayload === "object" ? Object.keys(providerPayload).join(",") : typeof providerPayload;
    throw new Error(`migrated control plane returned an invalid provider payload (${keys})`);
  }
  const pools = await waitHttp(18908, "/api/quota/pools", 200, auth);
  const poolPayload = await pools.json();
  if (!Array.isArray(poolPayload?.pools) && !Array.isArray(poolPayload?.items) && !Array.isArray(poolPayload)) {
    throw new Error("control quota pools endpoint returned an invalid payload");
  }
  const groups = await waitHttp(18908, "/api/quota/groups", 200, auth);
  const groupPayload = await groups.json();
  if (!Array.isArray(groupPayload?.groups) && !Array.isArray(groupPayload)) {
    throw new Error("control quota groups endpoint returned an invalid payload");
  }
  const evals = await waitHttp(18908, "/api/evals", 200, auth);
  const evalPayload = await evals.json();
  if (!Array.isArray(evalPayload?.suites) || JSON.stringify(evalPayload).includes("Mock output")) {
    throw new Error("control evals endpoint is not backed by the local runtime data path");
  }
  console.log(`real-data deployment smoke: PASS (${payload.data.length} models served from imported snapshot)`);
} finally {
  for (const child of children) {
    try { child.kill("SIGTERM"); } catch {}
  }
  await rm(dataDir, { recursive: true, force: true });
}
