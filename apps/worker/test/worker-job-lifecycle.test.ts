import assert from "node:assert/strict";
import test from "node:test";
import { WORKER_JOBS, type WorkerJob } from "../src/jobs/registry.js";
import { startWorkerJobs, stopWorkerJobs } from "../src/jobs/runner.js";

test("every worker registry entry has an explicit startup function", () => {
  assert.ok(WORKER_JOBS.every((job) => job.mode === "call" && job.exportName.length > 0));
  for (const name of ["batch-processor", "auto-refresh-daemon"]) {
    const job = WORKER_JOBS.find((entry) => entry.name === name);
    assert.ok(job);
    assert.ok(job.stopExportName);
  }
});

test("runner calls explicit start and stop exports", async () => {
  const stateKey = `__worker_job_lifecycle_${Date.now()}`;
  const state = globalThis as Record<string, unknown>;
  state[stateKey] = [];
  const source = [
    `export function start(){globalThis[${JSON.stringify(stateKey)}].push("start")}`,
    `export function stop(){globalThis[${JSON.stringify(stateKey)}].push("stop")}`,
  ].join(";");
  const job: WorkerJob = {
    name: "fixture",
    mode: "call",
    modulePath: `data:text/javascript,${encodeURIComponent(source)}`,
    exportName: "start",
    stopExportName: "stop",
  };

  const started = await startWorkerJobs([job], () => undefined);
  await stopWorkerJobs([job], started, () => undefined);
  assert.deepEqual(state[stateKey], ["start", "stop"]);
  delete state[stateKey];
});

test("worker-owned scheduler modules resolve from app-local paths", async () => {
  const [conductor, proxyHealth, freeProxy] = await Promise.all([
    import("../src/jobs/conductor-bridge.js"),
    import("../src/jobs/proxy-health.js"),
    import("../src/jobs/free-proxy-scheduler.js"),
  ]);
  assert.equal(typeof conductor.initConductorBridge, "function");
  assert.equal(typeof conductor.stopConductorBridge, "function");
  assert.equal(typeof proxyHealth.startProxyHealthCheck, "function");
  assert.equal(typeof proxyHealth.stopProxyHealthCheck, "function");
  assert.equal(typeof freeProxy.startFreeProxyAutoSync, "function");
  assert.equal(typeof freeProxy.stopFreeProxyAutoSync, "function");
});
