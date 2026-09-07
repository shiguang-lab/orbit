import assert from "node:assert/strict";
import test from "node:test";
import {
  createDatabaseHealthMaintenance,
  getDatabaseHealthMaintenanceIntervals,
} from "../src/jobs/database-health-maintenance.js";
import { WORKER_JOBS } from "../src/jobs/registry.js";

function timer(id: number) {
  return { id, unref() {} } as unknown as ReturnType<typeof setInterval>;
}

test("database maintenance timers are worker-owned, idempotent, and stoppable", () => {
  const callbacks: Array<() => void> = [];
  const delays: number[] = [];
  const stopped: Array<ReturnType<typeof setInterval>> = [];
  let healthRuns = 0;
  let checkpointRuns = 0;
  const maintenance = createDatabaseHealthMaintenance({
    runHealthCheck: () => { healthRuns += 1; },
    runWalCheckpoint: () => { checkpointRuns += 1; },
    setInterval: (callback, delayMs) => {
      callbacks.push(callback);
      delays.push(delayMs);
      return timer(callbacks.length);
    },
    clearInterval: (handle) => { stopped.push(handle); },
    logError: () => undefined,
  });

  maintenance.start({ healthCheckMs: 100, walTruncateMs: 200 });
  maintenance.start({ healthCheckMs: 300, walTruncateMs: 400 });
  assert.deepEqual(delays, [100, 200]);
  callbacks[0]?.();
  callbacks[1]?.();
  assert.equal(healthRuns, 2);
  assert.equal(checkpointRuns, 1);

  maintenance.stop();
  maintenance.stop();
  assert.equal(stopped.length, 2);
});

test("zero intervals disable each worker-owned maintenance timer", () => {
  let timerCount = 0;
  let healthRuns = 0;
  const maintenance = createDatabaseHealthMaintenance({
    runHealthCheck: () => { healthRuns += 1; },
    runWalCheckpoint: () => undefined,
    setInterval: () => {
      timerCount += 1;
      return timer(timerCount);
    },
    clearInterval: () => undefined,
    logError: () => undefined,
  });
  maintenance.start({ healthCheckMs: 0, walTruncateMs: 0 });
  maintenance.start({ healthCheckMs: 0, walTruncateMs: 0 });
  assert.equal(timerCount, 0);
  assert.equal(healthRuns, 1);
});

test("maintenance intervals retain environment configuration", () => {
  const originalHealth = process.env.SHIGUANG_GATEWAY_DB_HEALTHCHECK_INTERVAL_MS;
  const originalWal = process.env.SHIGUANG_GATEWAY_WAL_TRUNCATE_INTERVAL_MS;
  process.env.SHIGUANG_GATEWAY_DB_HEALTHCHECK_INTERVAL_MS = "123";
  process.env.SHIGUANG_GATEWAY_WAL_TRUNCATE_INTERVAL_MS = "456";
  try {
    assert.deepEqual(getDatabaseHealthMaintenanceIntervals(), {
      healthCheckMs: 123,
      walTruncateMs: 456,
    });
  } finally {
    if (originalHealth === undefined) delete process.env.SHIGUANG_GATEWAY_DB_HEALTHCHECK_INTERVAL_MS;
    else process.env.SHIGUANG_GATEWAY_DB_HEALTHCHECK_INTERVAL_MS = originalHealth;
    if (originalWal === undefined) delete process.env.SHIGUANG_GATEWAY_WAL_TRUNCATE_INTERVAL_MS;
    else process.env.SHIGUANG_GATEWAY_WAL_TRUNCATE_INTERVAL_MS = originalWal;
  }
});

test("worker registry owns database health maintenance start and stop", async () => {
  const job = WORKER_JOBS.find(({ name }) => name === "database-health-maintenance");
  assert.ok(job);
  assert.equal(job.exportName, "startDatabaseHealthMaintenance");
  assert.equal(job.stopExportName, "stopDatabaseHealthMaintenance");
  const runtime = await job.loadModule() as Record<string, unknown>;
  assert.equal(typeof runtime.startDatabaseHealthMaintenance, "function");
  assert.equal(typeof runtime.stopDatabaseHealthMaintenance, "function");
});
