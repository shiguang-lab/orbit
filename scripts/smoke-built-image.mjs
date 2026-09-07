#!/usr/bin/env node
/** Start the actual release image with its default command before publishing it. */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const [target, image] = process.argv.slice(2);
const ports = { "edge-gateway": 8787, "control-api": 8788, realtime: 8790, worker: 8791 };
if (!Object.hasOwn(ports, target) || !image) {
  console.error("Usage: node scripts/smoke-built-image.mjs <edge-gateway|control-api|realtime|worker> <local-image>");
  process.exit(2);
}
const name = `gateway-image-smoke-${randomUUID()}`;
const volume = `${name}-data`;
function docker(args, required = true) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 20000 });
  if (required && result.status !== 0) throw new Error(`docker ${args[0]} failed: ${result.stderr || result.error || result.stdout}`);
  return result;
}
const env = {
  NODE_ENV: "production", APP_NAME: target, DATA_DIR: "/app/data", SQLITE_FILE: "/app/data/storage.sqlite",
  JWT_SECRET: "image-smoke-jwt-secret-not-production-123456",
  API_KEY_SECRET: "image-smoke-api-secret-not-production-123456",
  STORAGE_ENCRYPTION_KEY: "image-smoke-storage-secret-not-production-123456",
  SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN: "image-smoke-internal-token-not-production",
  SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN: "image-smoke-worker-token-not-production",
  PUBLIC_BASE_URL: "http://127.0.0.1:8787", INTERNAL_BASE_URL: "http://127.0.0.1:8787",
  SHIGUANG_GATEWAY_BASE_URL: "http://127.0.0.1:8787", EDGE_GATEWAY_URL: "http://127.0.0.1:8787",
  EDGE_GATEWAY_HOST: "0.0.0.0", EDGE_GATEWAY_PORT: "8787",
  CONTROL_API_HOST: "0.0.0.0", CONTROL_API_PORT: "8788",
  REALTIME_HOST: "0.0.0.0", REALTIME_PORT: "8790", LIVE_WS_HOST: "0.0.0.0", LIVE_WS_PORT: "20132",
  WORKER_COMMAND_HOST: "0.0.0.0", WORKER_COMMAND_PORT: "8791",
  SHIGUANG_GATEWAY_ENABLE_LIVE_WS: target === "realtime" ? "true" : "false",
  SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES: "0", SHIGUANG_GATEWAY_ENABLE_RUNTIME_BACKGROUND_TASKS: "1",
  QUOTA_STORE_DRIVER: "sqlite", LOG_LEVEL: "warn",
  SHIGUANG_GATEWAY_AUTH_MODE: "shiguang",
};
try {
  docker(["volume", "create", volume]);
  // No source mounts, real credentials, external network, or entrypoint override.
  docker(["run", "--detach", "--name", name, "--network", "none", "--init",
    "--mount", `type=volume,src=${volume},dst=/app/data`,
    ...Object.entries(env).flatMap(([key, value]) => ["--env", `${key}=${value}`]), image]);
  const probe = `fetch('http://127.0.0.1:${ports[target]}/healthz',{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))`;
  const deadline = Date.now() + 90000;
  let healthySince = null;
  while (Date.now() < deadline) {
    const running = docker(["inspect", "--format", "{{.State.Running}}", name]).stdout.trim();
    if (running !== "true") throw new Error(`${target} exited before startup verification`);
    if (docker(["exec", name, "node", "-e", probe], false).status === 0) {
      healthySince ??= Date.now();
      if (Date.now() - healthySince >= 5000) break;
    } else healthySince = null;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!healthySince || Date.now() - healthySince < 5000) throw new Error(`${target} did not remain healthy`);
  if (target === "control-api") {
    const authProbe = `fetch('http://127.0.0.1:8788/api/providers/test-batch', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({mode:'selected',connectionIds:[]}), signal:AbortSignal.timeout(5000)
    }).then(r=>{if(r.status!==401)throw new Error('management auth status='+r.status)}).catch(e=>{console.error(e.message);process.exit(1)})`;
    docker(["exec", name, "node", "-e", authProbe]);
  }
  const logs = docker(["logs", name]);
  const output = `${logs.stdout}\n${logs.stderr}`;
  if (/ERR_MODULE_NOT_FOUND|Cannot find (?:package|module)|ERR_DLOPEN_FAILED/.test(output)) {
    throw new Error(`${target} reported a missing runtime dependency`);
  }
  console.log(JSON.stringify({ status: "PASS", target, image, health: 200, defaultCommand: true }));
} catch (error) {
  const logs = docker(["logs", "--tail", "100", name], false);
  console.error(`${logs.stdout || ""}${logs.stderr || ""}`);
  console.error(error instanceof Error ? error.message : "built image startup failed");
  process.exitCode = 1;
} finally {
  docker(["rm", "--force", name], false);
  docker(["volume", "rm", volume], false);
}
