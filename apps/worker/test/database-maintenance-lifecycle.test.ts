import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseCleanupScheduler } from "../src/jobs/database-cleanup.js";
import { createDatabaseVacuumScheduler } from "../src/jobs/database-vacuum.js";

function timer() {
  return { unref() {} } as unknown as ReturnType<typeof setTimeout>;
}

test("database cleanup owns startup and periodic timers in the worker", async () => {
  const delays: number[] = [];
  const callbacks: Array<() => void> = [];
  let cleanupRuns = 0;
  let vacuumRuns = 0;
  const scheduler = createDatabaseCleanupScheduler({
    runCleanup: async () => ({ totalDeleted: ++cleanupRuns, totalErrors: 0, results: {} }),
    cleanupProxyLogs: async () => ({ deleted: 0, errors: 0 }),
    runVacuum: async () => { vacuumRuns++; return { success: true, durationMs: 1 }; },
    setTimeout: (callback, delay) => { callbacks.push(callback); delays.push(delay); return timer(); },
    clearTimeout() {},
    setInterval: (callback, delay) => { callbacks.push(callback); delays.push(delay); return timer(); },
    clearInterval() {},
    log: { log() {}, error() {} },
  });
  scheduler.start();
  assert.deepEqual(delays, [30_000, 6 * 60 * 60 * 1000]);
  callbacks[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cleanupRuns, 1);
  assert.equal(vacuumRuns, 1);
  scheduler.stop();
});

test("database vacuum persists schedule state while the worker owns its timer", () => {
  let state = {
    enabled: false, intervalMs: 0, lastRunAt: null, lastError: null,
    lastDurationMs: null, isRunning: false, nextRunAt: null,
  };
  const delays: number[] = [];
  const scheduler = createDatabaseVacuumScheduler({
    getSettings: () => ({ scheduledVacuum: "daily", vacuumHour: 2 }),
    readState: () => ({ ...state }),
    writeState: (next) => { state = { ...next }; },
    runVacuum: async () => ({ success: true, durationMs: 1 }),
    now: () => new Date("2026-09-07T00:00:00").getTime(),
    setTimeout: (_callback, delay) => { delays.push(delay); return timer(); },
    clearTimeout() {},
    logError() {},
  });
  const started = scheduler.start();
  assert.equal(started.enabled, true);
  assert.equal(started.intervalMs, 24 * 60 * 60 * 1000);
  assert.equal(delays.length, 1);
  scheduler.stop();
  assert.equal(state.nextRunAt, null);
});
