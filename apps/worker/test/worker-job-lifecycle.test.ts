import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WORKER_JOBS, type WorkerJob } from "../src/jobs/registry.js";
import { startWorkerJobs, stopWorkerJobs } from "../src/jobs/runner.js";

test("every worker registry entry has an explicit startup function", () => {
  assert.ok(WORKER_JOBS.every((job) => job.mode === "call" && job.exportName.length > 0 && typeof job.loadModule === "function"));
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
  const job: WorkerJob = {
    name: "fixture",
    mode: "call",
    loadModule: async () => ({
      start: () => (state[stateKey] as string[]).push("start"),
      stop: () => (state[stateKey] as string[]).push("stop"),
    }),
    exportName: "start",
    stopExportName: "stop",
  };

  const started = await startWorkerJobs([job], () => undefined);
  await stopWorkerJobs([job], started, () => undefined);
  assert.deepEqual(state[stateKey], ["start", "stop"]);
  delete state[stateKey];
});

test("worker-owned scheduler modules resolve from app-local paths", async () => {
  const [conductor, proxyHealth, freeProxy, databaseCleanup, databaseVacuum, modelsDev, pricing, connectionRecovery] = await Promise.all([
    import("../src/jobs/conductor-bridge.js"),
    import("../src/jobs/proxy-health.js"),
    import("../src/jobs/free-proxy-scheduler.js"),
    import("../src/jobs/database-cleanup.js"),
    import("../src/jobs/database-vacuum.js"),
    import("../src/jobs/models-dev-sync.js"),
    import("../src/jobs/pricing-sync.js"),
    import("../src/jobs/connection-recovery.js"),
  ]);
  assert.equal(typeof conductor.initConductorBridge, "function");
  assert.equal(typeof conductor.stopConductorBridge, "function");
  assert.equal(typeof proxyHealth.startProxyHealthCheck, "function");
  assert.equal(typeof proxyHealth.stopProxyHealthCheck, "function");
  assert.equal(typeof freeProxy.startFreeProxyAutoSync, "function");
  assert.equal(typeof freeProxy.stopFreeProxyAutoSync, "function");
  assert.equal(typeof databaseCleanup.startCleanupScheduler, "function");
  assert.equal(typeof databaseCleanup.stopCleanupScheduler, "function");
  assert.equal(typeof databaseVacuum.initVacuumScheduler, "function");
  assert.equal(typeof databaseVacuum.stopVacuumScheduler, "function");
  assert.equal(typeof modelsDev.startModelsDevSyncScheduler, "function");
  assert.equal(typeof modelsDev.stopModelsDevSyncScheduler, "function");
  assert.equal(typeof pricing.startPricingSyncScheduler, "function");
  assert.equal(typeof pricing.stopPricingSyncScheduler, "function");
  assert.equal(typeof connectionRecovery.initConnectionRecoveryScheduler, "function");
  assert.equal(typeof connectionRecovery.stopConnectionRecoveryScheduler, "function");
  const registrySource = fs.readFileSync(new URL("../src/jobs/registry.ts", import.meta.url), "utf8");
  assert.match(registrySource, /import\("\.\/database-cleanup\.js"\)/);
  assert.match(registrySource, /import\("\.\/database-vacuum\.js"\)/);
  assert.match(registrySource, /import\("\.\/models-dev-sync\.js"\)/);
  assert.match(registrySource, /import\("\.\/pricing-sync\.js"\)/);
  assert.match(registrySource, /import\("\.\/connection-recovery\.js"\)/);
  assert.doesNotMatch(registrySource, /core-domain\/worker\/database-(?:cleanup|vacuum)-lifecycle/);
  assert.doesNotMatch(registrySource, /core-domain\/worker\/(?:model|pricing)-sync-lifecycle/);
});
