import assert from "node:assert/strict";
import test from "node:test";
import { createConnectionRecoveryScheduler } from "../src/jobs/connection-recovery.js";

function timer() { return { unref() {} } as unknown as ReturnType<typeof setTimeout>; }

test("connection recovery startup delay and interval are worker-owned", async () => {
  const delays: number[] = [];
  let startupCallback: (() => void) | null = null;
  let ticks = 0;
  let clearedStartup = 0;
  let clearedInterval = 0;
  const scheduler = createConnectionRecoveryScheduler({
    runTick: async () => { ticks++; return { scanned: 0, recovered: 0, recoveredIds: [] }; },
    resolveIntervalMs: () => 60_000,
    disabled: () => false,
    setTimeout: (callback, delay) => { startupCallback = callback; delays.push(delay); return timer(); },
    clearTimeout: () => { clearedStartup++; },
    setInterval: (_callback, delay) => { delays.push(delay); return timer(); },
    clearInterval: () => { clearedInterval++; },
    log: { log() {}, warn() {} },
  });
  scheduler.start();
  assert.deepEqual(delays, [15_000]);
  assert.ok(startupCallback);
  (startupCallback as () => void)();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ticks, 1);
  assert.deepEqual(delays, [15_000, 60_000]);
  scheduler.stop();
  assert.equal(clearedStartup, 0);
  assert.equal(clearedInterval, 1);
});

test("connection recovery does not allocate timers when disabled", () => {
  let timerCount = 0;
  const scheduler = createConnectionRecoveryScheduler({
    runTick: async () => ({ scanned: 0, recovered: 0, recoveredIds: [] }),
    resolveIntervalMs: () => 60_000,
    disabled: () => true,
    setTimeout: () => { timerCount++; return timer(); },
    clearTimeout() {},
    setInterval: () => { timerCount++; return timer(); },
    clearInterval() {},
    log: { log() {}, warn() {} },
  });
  scheduler.start();
  assert.equal(timerCount, 0);
});
