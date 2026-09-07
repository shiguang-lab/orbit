import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WORKER_JOBS, type WorkerJob } from "../src/jobs/registry.js";
import { startWorkerJobs, stopWorkerJobs } from "../src/jobs/runner.js";
import {
  startSubscriptionScheduler,
  stopSubscriptionScheduler,
} from "../src/jobs/proxy-subscription.js";

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

test("proxy subscription scheduler is app-owned, idempotent, and stoppable", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const fakeTimer = { unref() {} } as NodeJS.Timeout;
  let starts = 0;
  let stops = 0;
  process.env.NODE_ENV = "production";
  globalThis.setInterval = (() => {
    starts++;
    return fakeTimer;
  }) as typeof setInterval;
  globalThis.clearInterval = ((timer: NodeJS.Timeout | number | undefined) => {
    assert.equal(timer, fakeTimer);
    stops++;
  }) as typeof clearInterval;
  try {
    startSubscriptionScheduler();
    startSubscriptionScheduler();
    assert.equal(starts, 1);
    stopSubscriptionScheduler();
    stopSubscriptionScheduler();
    assert.equal(stops, 1);
  } finally {
    stopSubscriptionScheduler();
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("worker-owned scheduler modules resolve from app-local paths", async () => {
  const [conductor, proxyHealth, freeProxy, databaseCleanup, databaseVacuum, modelsDev, pricing, connectionRecovery, proxySubscription] = await Promise.all([
    import("../src/jobs/conductor-bridge.js"),
    import("../src/jobs/proxy-health.js"),
    import("../src/jobs/free-proxy-scheduler.js"),
    import("../src/jobs/database-cleanup.js"),
    import("../src/jobs/database-vacuum.js"),
    import("../src/jobs/models-dev-sync.js"),
    import("../src/jobs/pricing-sync.js"),
    import("../src/jobs/connection-recovery.js"),
    import("../src/jobs/proxy-subscription.js"),
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
  assert.equal(typeof proxySubscription.startSubscriptionScheduler, "function");
  assert.equal(typeof proxySubscription.stopSubscriptionScheduler, "function");
  const registrySource = fs.readFileSync(new URL("../src/jobs/registry.ts", import.meta.url), "utf8");
  assert.match(registrySource, /import\("\.\/database-cleanup\.js"\)/);
  assert.match(registrySource, /import\("\.\/database-vacuum\.js"\)/);
  assert.match(registrySource, /import\("\.\/models-dev-sync\.js"\)/);
  assert.match(registrySource, /import\("\.\/pricing-sync\.js"\)/);
  assert.match(registrySource, /import\("\.\/connection-recovery\.js"\)/);
  assert.match(registrySource, /import\("\.\/proxy-subscription\.js"\)/);
  assert.doesNotMatch(registrySource, /core\/worker\/database-(?:cleanup|vacuum)-lifecycle/);
  assert.doesNotMatch(registrySource, /core\/worker\/(?:model|pricing)-sync-lifecycle/);
  assert.doesNotMatch(registrySource, /core\/worker\/proxy-subscription-lifecycle/);
});
