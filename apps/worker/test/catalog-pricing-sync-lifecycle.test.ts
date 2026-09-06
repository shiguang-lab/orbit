import assert from "node:assert/strict";
import test from "node:test";
import { createModelsDevScheduler } from "../src/jobs/models-dev-sync.js";
import { createPricingSyncScheduler } from "../src/jobs/pricing-sync.js";

function timer() { return { unref() {} } as unknown as ReturnType<typeof setInterval>; }

test("models.dev lifecycle reacts to shared settings and aborts in-flight work on stop", async () => {
  const intervals: number[] = [];
  let aborted = false;
  const scheduler = createModelsDevScheduler({
    getSettings: async () => ({ modelsDevSyncEnabled: true, modelsDevSyncInterval: 5_000 }),
    sync: async ({ signal } = {}) => {
      signal?.addEventListener("abort", () => { aborted = true; });
      return await new Promise(() => undefined);
    },
    envDisabled: () => false,
    envForcedOn: () => false,
    resolveIntervalMs: (value) => Number(value),
    setInterval: (_callback, intervalMs) => { intervals.push(intervalMs); return timer(); },
    clearInterval() {},
    createAbortController: () => new AbortController(),
    log: { log() {}, warn() {} },
  });
  await scheduler.start();
  assert.deepEqual(intervals, [5_000, 1_000]);
  scheduler.stop();
  assert.equal(aborted, true);
});

test("pricing lifecycle remains disabled unless explicitly enabled", () => {
  let syncRuns = 0;
  let intervalRuns = 0;
  const disabled = createPricingSyncScheduler({
    sync: async () => { syncRuns++; return { success: true, modelCount: 0, providerCount: 0, source: "litellm", dryRun: false }; },
    enabled: () => false,
    intervalMs: () => 10_000,
    setInterval: () => { intervalRuns++; return timer(); },
    clearInterval() {},
    log: { log() {}, warn() {} },
  });
  disabled.start();
  assert.equal(syncRuns, 0);
  assert.equal(intervalRuns, 0);
});
