import { spawn } from "node:child_process";
import net from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanupPidFile, isPidRunning, readPidFile, sleep, writePidFile } from "../utils/pid.mjs";

export const SPLIT_SERVICE_NAMES = ["gateway", "control", "realtime", "worker"];
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));

function port(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

export function pidServiceName(name) {
  return `split/${name}`;
}

export function resolveSplitPlan(opts = {}, env = process.env, workspaceRoot = WORKSPACE_ROOT) {
  const edgePort = port(opts.port ?? env.EDGE_GATEWAY_PORT, 8787);
  const controlPort = port(opts.controlPort ?? env.CONTROL_API_PORT, 8788);
  const realtimePort = port(opts.realtimePort ?? env.REALTIME_PORT, 8790);
  const workerPort = port(opts.workerCommandPort ?? env.WORKER_COMMAND_PORT, 8791);
  const liveWsPort = port(opts.liveWsPort ?? env.LIVE_WS_PORT, 20132);
  const edgeHost = env.EDGE_GATEWAY_HOST ?? env.ORBIT_SERVER_HOST ?? "127.0.0.1";
  const base = { ...env, NODE_ENV: env.NODE_ENV ?? "production" };
  const edgeUrl = `http://127.0.0.1:${edgePort}`;
  const service = (name, serviceEnv, health) => ({
    name,
    cwd: join(workspaceRoot, "apps", name),
    env: { ...base, APP_NAME: name, ...serviceEnv },
    health,
  });

  return [
    service("gateway", {
      EDGE_GATEWAY_HOST: edgeHost,
      EDGE_GATEWAY_PORT: String(edgePort),
      ORBIT_ENABLE_LIVE_WS: "false",
    }, { kind: "http", port: edgePort, path: "/healthz" }),
    service("control", {
      CONTROL_API_HOST: "127.0.0.1",
      CONTROL_API_PORT: String(controlPort),
      EDGE_GATEWAY_URL: edgeUrl,
      ORBIT_WORKER_COMMAND_URL: `http://127.0.0.1:${workerPort}`,
    }, { kind: "http", port: controlPort, path: "/healthz" }),
    service("realtime", {
      REALTIME_HOST: "127.0.0.1",
      REALTIME_PORT: String(realtimePort),
      LIVE_WS_HOST: "127.0.0.1",
      LIVE_WS_PORT: String(liveWsPort),
      ORBIT_ENABLE_LIVE_WS: "true",
    }, { kind: "http", port: realtimePort, path: "/healthz" }),
    service("worker", {
      WORKER_COMMAND_HOST: "127.0.0.1",
      WORKER_COMMAND_PORT: String(workerPort),
      INTERNAL_BASE_URL: edgeUrl,
      ORBIT_BASE_URL: edgeUrl,
    }, { kind: "tcp", port: workerPort }),
  ];
}

export function spawnSplitService(service, options = {}, spawnImpl = spawn) {
  const tsxCli = join(service.cwd, "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawnImpl(process.execPath, [
    tsxCli,
    "--tsconfig",
    join(service.cwd, "tsconfig.json"),
    join(service.cwd, "src", "main.ts"),
  ], {
    cwd: service.cwd,
    env: service.env,
    detached: options.daemon === true,
    stdio: options.daemon ? "ignore" : "inherit",
  });
  if (!Number.isInteger(child.pid)) throw new Error(`Failed to start ${service.name}`);
  return child;
}

async function tcpReady(portNumber, connect = net.createConnection) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: portNumber });
    let settled = false;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ready);
    };
    socket.setTimeout(500, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

export async function waitForSplitHealth(service, child, deps = {}) {
  const timeoutMs = deps.timeoutMs ?? 60_000;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleepImpl = deps.sleepImpl ?? sleep;
  const deadline = Date.now() + timeoutMs;
  let lastError = "not listening";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${service.name} exited before becoming healthy (code ${child.exitCode})`);
    }
    try {
      const ready = service.health.kind === "http"
        ? (await fetchImpl(`http://127.0.0.1:${service.health.port}${service.health.path}`, {
            signal: AbortSignal.timeout(1_000),
          })).ok
        : await tcpReady(service.health.port, deps.connect);
      if (ready) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleepImpl(250);
  }
  throw new Error(`${service.name} health check timed out: ${lastError}`);
}

export async function stopPidGracefully(pid, deps = {}) {
  const kill = deps.kill ?? process.kill.bind(process);
  const running = deps.running ?? isPidRunning;
  const sleepImpl = deps.sleepImpl ?? sleep;
  if (!running(pid)) return false;
  try { kill(pid, "SIGTERM"); } catch { return false; }
  const deadline = Date.now() + (deps.timeoutMs ?? 5_000);
  while (Date.now() < deadline && running(pid)) await sleepImpl(50);
  if (running(pid)) {
    try { kill(pid, "SIGKILL"); } catch {}
  }
  return true;
}

export async function stopSplitServices(deps = {}) {
  const readPid = deps.readPidFile ?? readPidFile;
  const cleanupPid = deps.cleanupPidFile ?? cleanupPidFile;
  const stopPid = deps.stopPid ?? ((pid) => stopPidGracefully(pid, deps));
  const stopped = [];
  for (const name of [...SPLIT_SERVICE_NAMES].reverse()) {
    const key = pidServiceName(name);
    const pid = readPid(key);
    if (pid) {
      const didStop = await stopPid(pid, name);
      if (didStop !== false) stopped.push({ name, pid });
    }
    cleanupPid(key);
  }
  return stopped;
}

export async function startSplitServices(plan, options = {}, deps = {}) {
  const spawnService = deps.spawnService ?? ((service) => spawnSplitService(service, options));
  const waitForHealth = deps.waitForHealth ?? waitForSplitHealth;
  const persistPid = deps.writePidFile ?? writePidFile;
  const readPid = deps.readPidFile ?? readPidFile;
  const running = deps.isPidRunning ?? isPidRunning;
  const cleanupPid = deps.cleanupPidFile ?? cleanupPidFile;
  const stopPid = deps.stopPid ?? ((pid) => stopPidGracefully(pid));
  const children = [];
  for (const service of plan) {
    const key = pidServiceName(service.name);
    const existingPid = readPid(key);
    if (existingPid && running(existingPid)) {
      throw new Error(`${service.name} is already running (PID ${existingPid})`);
    }
    if (existingPid) cleanupPid(key);
  }
  const start = async (service) => {
    const child = spawnService(service);
    children.push({ service, child });
    if (!persistPid(pidServiceName(service.name), child.pid)) {
      throw new Error(`Could not persist ${service.name} PID`);
    }
    await waitForHealth(service, child, { timeoutMs: options.timeoutMs ?? 60_000 });
  };
  try {
    await start(plan[0]);
    await Promise.all(plan.slice(1).map(start));
    if (options.daemon) children.forEach(({ child }) => child.unref());
    return children;
  } catch (error) {
    await Promise.allSettled(children.map(({ child }) => stopPid(child.pid)));
    children.forEach(({ service }) => cleanupPid(pidServiceName(service.name)));
    throw error;
  }
}

export async function holdForeground(children, deps = {}) {
  const processLike = deps.processLike ?? process;
  const stop = deps.stop ?? (() => stopSplitServices());
  return new Promise((resolve, reject) => {
    let stopping = false;
    const cleanup = () => {
      processLike.off("SIGINT", onSigint);
      processLike.off("SIGTERM", onSigterm);
    };
    const finish = async (signal) => {
      if (stopping) return;
      stopping = true;
      try {
        await stop();
        cleanup();
        resolve(signal);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const onSigint = () => void finish("SIGINT");
    const onSigterm = () => void finish("SIGTERM");
    processLike.on("SIGINT", onSigint);
    processLike.on("SIGTERM", onSigterm);
    for (const { service, child } of children) {
      child.once("exit", (code, signal) => {
        if (stopping) return;
        stopping = true;
        void stop().finally(() => {
          cleanup();
          reject(new Error(`${service.name} exited unexpectedly (${signal ?? code ?? "unknown"})`));
        });
      });
    }
  });
}
