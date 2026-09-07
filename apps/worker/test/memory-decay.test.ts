import assert from "node:assert/strict";
import test from "node:test";
import {
  executeMemoryDecay,
  executeMemoryRetentionCleanup,
  startMemoryDecayScheduler,
  stopMemoryDecayScheduler,
} from "../src/jobs/memory-decay.js";

test("memory decay command uses the authenticated edge endpoint", async () => {
  const previousToken = process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN;
  process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = "worker-edge-test-token";
  try {
    const result = await executeMemoryDecay(async (input, init) => {
      assert.equal(String(input), "http://127.0.0.1:8787/api/internal/runtime/command");
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("x-shiguang-gateway-internal-service-token"),
        "worker-edge-test-token",
      );
      assert.deepEqual(JSON.parse(String(init?.body)), { version: 1, command: "memory.decay" });
      return Response.json({ decayed: 1, deletedIds: ["memory-1"] });
    });
    assert.deepEqual(result, { decayed: 1, deletedIds: ["memory-1"] });
  } finally {
    if (previousToken === undefined) delete process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN;
    else process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = previousToken;
  }
});

test("memory retention cleanup uses the same edge-owned writer boundary", async () => {
  const result = await executeMemoryRetentionCleanup(async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {
      version: 1,
      command: "memory.retention-cleanup",
    });
    return Response.json({ deleted: 4, errors: 0 });
  });
  assert.deepEqual(result, { deleted: 4, errors: 0 });
});

test("worker owns an idempotent and stoppable memory decay cadence", () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const fakeTimer = { unref() {} } as NodeJS.Timeout;
  let timerStarts = 0;
  let timerStops = 0;
  let executions = 0;
  globalThis.setInterval = ((callback: () => void, delay: number) => {
    assert.equal(delay, 25_000);
    assert.equal(typeof callback, "function");
    timerStarts++;
    return fakeTimer;
  }) as typeof setInterval;
  globalThis.clearInterval = ((timer: NodeJS.Timeout | number | undefined) => {
    assert.equal(timer, fakeTimer);
    timerStops++;
  }) as typeof clearInterval;
  try {
    const execute = async () => { executions++; };
    startMemoryDecayScheduler({ enabled: true, intervalMs: 25_000, execute });
    startMemoryDecayScheduler({ enabled: true, intervalMs: 25_000, execute });
    assert.equal(executions, 1);
    assert.equal(timerStarts, 1);
    stopMemoryDecayScheduler();
    stopMemoryDecayScheduler();
    assert.equal(timerStops, 1);
  } finally {
    stopMemoryDecayScheduler();
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});
