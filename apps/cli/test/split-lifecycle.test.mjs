import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { runRestartCommand } from "../src/cli/commands/restart.mjs";
import { runServe } from "../src/cli/commands/serve.mjs";
import {
  pidServiceName,
  resolveSplitPlan,
  spawnSplitService,
  startSplitServices,
  stopPidGracefully,
  stopSplitServices,
} from "../src/cli/runtime/splitLifecycle.mjs";

function child(pid) {
  const value = new EventEmitter();
  value.pid = pid;
  value.exitCode = null;
  value.unrefCalls = 0;
  value.unref = () => { value.unrefCalls += 1; };
  return value;
}

test("split plan maps CLI ports and internal service URLs", () => {
  const plan = resolveSplitPlan({
    port: "19001",
    controlPort: "19002",
    realtimePort: "19003",
    workerCommandPort: "19004",
    liveWsPort: "19005",
  }, { JWT_SECRET: "test", EDGE_GATEWAY_HOST: "0.0.0.0" }, "/workspace");

  assert.deepEqual(plan.map(({ name, health }) => [name, health.port]), [
    ["edge-gateway", 19001],
    ["control-api", 19002],
    ["realtime", 19003],
    ["worker", 19004],
  ]);
  assert.equal(plan[1].env.EDGE_GATEWAY_URL, "http://127.0.0.1:19001");
  assert.equal(plan[1].env.SHIGUANG_GATEWAY_WORKER_COMMAND_URL, "http://127.0.0.1:19004");
  assert.equal(plan[2].env.LIVE_WS_PORT, "19005");
  assert.equal(plan[3].env.SHIGUANG_GATEWAY_BASE_URL, "http://127.0.0.1:19001");
});

test("service spawn invokes the app-local tsx entrypoint", () => {
  const service = resolveSplitPlan({}, {}, "/workspace")[0];
  let invocation;
  const spawned = child(99);
  assert.equal(spawnSplitService(service, { daemon: true }, (...args) => {
    invocation = args;
    return spawned;
  }), spawned);
  assert.equal(invocation[0], process.execPath);
  assert.deepEqual(invocation[1], [
    "/workspace/apps/edge-gateway/node_modules/tsx/dist/cli.mjs",
    "--tsconfig",
    "/workspace/apps/edge-gateway/tsconfig.json",
    "/workspace/apps/edge-gateway/src/main.ts",
  ]);
  assert.equal(invocation[2].detached, true);
  assert.equal(invocation[2].stdio, "ignore");
});

test("startup waits for edge before starting dependants and persists daemon PIDs", async () => {
  const plan = resolveSplitPlan({}, {}, "/workspace");
  const events = [];
  const children = new Map();
  const result = await startSplitServices(plan, { daemon: true }, {
    spawnService(service) {
      events.push(`spawn:${service.name}`);
      const value = child(100 + children.size);
      children.set(service.name, value);
      return value;
    },
    async waitForHealth(service) { events.push(`health:${service.name}`); },
    readPidFile() { return null; },
    writePidFile(key, pid) { events.push(`pid:${key}:${pid}`); return true; },
  });

  assert.deepEqual(events.slice(0, 3), [
    "spawn:edge-gateway",
    `pid:${pidServiceName("edge-gateway")}:100`,
    "health:edge-gateway",
  ]);
  assert.equal(events.indexOf("health:edge-gateway") < events.indexOf("spawn:control-api"), true);
  assert.equal(result.length, 4);
  assert.deepEqual([...children.values()].map((value) => value.unrefCalls), [1, 1, 1, 1]);
});

test("failed readiness stops every process already spawned and clears its PID", async () => {
  const plan = resolveSplitPlan({}, {}, "/workspace");
  const stopped = [];
  const cleaned = [];
  await assert.rejects(
    startSplitServices(plan, {}, {
      spawnService(service) { return child(200 + plan.indexOf(service)); },
      async waitForHealth(service) {
        if (service.name === "realtime") throw new Error("not ready");
      },
      readPidFile() { return null; },
      writePidFile() { return true; },
      async stopPid(pid) { stopped.push(pid); },
      cleanupPidFile(key) { cleaned.push(key); },
    }),
    /not ready/
  );
  assert.deepEqual(stopped.sort(), [200, 201, 202, 203]);
  assert.equal(cleaned.length, 4);
});

test("startup refuses to overwrite a live daemon PID", async () => {
  const plan = resolveSplitPlan({}, {}, "/workspace");
  let spawned = false;
  await assert.rejects(startSplitServices(plan, {}, {
    readPidFile(key) { return key === pidServiceName("control-api") ? 8123 : null; },
    isPidRunning: () => true,
    spawnService() { spawned = true; },
  }), /control-api is already running \(PID 8123\)/);
  assert.equal(spawned, false);
});

test("stop terminates split services in reverse dependency order", async () => {
  const pids = new Map([
    [pidServiceName("edge-gateway"), 1],
    [pidServiceName("control-api"), 2],
    [pidServiceName("realtime"), 3],
    [pidServiceName("worker"), 4],
  ]);
  const stopped = [];
  const cleaned = [];
  const result = await stopSplitServices({
    readPidFile: (key) => pids.get(key) ?? null,
    stopPid: async (pid, name) => stopped.push([name, pid]),
    cleanupPidFile: (key) => cleaned.push(key),
  });
  assert.deepEqual(stopped, [["worker", 4], ["realtime", 3], ["control-api", 2], ["edge-gateway", 1]]);
  assert.deepEqual(result.map(({ name }) => name), ["worker", "realtime", "control-api", "edge-gateway"]);
  assert.equal(cleaned.length, 4);
});

test("graceful stop sends SIGTERM and escalates only while the PID remains alive", async () => {
  const signals = [];
  let running = true;
  await stopPidGracefully(42, {
    running: () => running,
    kill(_pid, signal) { signals.push(signal); running = false; },
    sleepImpl: async () => {},
  });
  assert.deepEqual(signals, ["SIGTERM"]);

  await stopPidGracefully(43, {
    running: () => true,
    kill(_pid, signal) { signals.push(signal); },
    timeoutMs: 0,
  });
  assert.deepEqual(signals, ["SIGTERM", "SIGTERM", "SIGKILL"]);
});

test("tray mode is rejected before any service is spawned", async () => {
  let spawned = false;
  await assert.rejects(runServe({ tray: true }, {
    spawnService() { spawned = true; },
  }), /not supported by the split runtime/);
  assert.equal(spawned, false);
});

test("restart stops the old split runtime before starting the replacement", async () => {
  const events = [];
  const exitCode = await runRestartCommand({ daemon: true }, {
    readPidFile: () => null,
    cleanupPidFile: () => {},
    sleep: async () => events.push("sleep"),
    runServe: async (opts) => events.push(`serve:${opts.daemon}`),
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(events, ["sleep", "serve:true"]);
});
