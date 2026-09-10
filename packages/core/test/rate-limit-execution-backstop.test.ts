import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * #12027 — `requestQueue.executionMaxWaitMs` is a dedicated limiter execution
 * backstop, independent of the queue-wait budget (`maxWaitMs`).
 */

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-exec-backstop-"));
const originalDataDir = process.env.DATA_DIR;
const originalExecOverride = process.env.RATE_LIMIT_EXECUTION_MAX_WAIT_MS;
const originalWaitOverride = process.env.RATE_LIMIT_MAX_WAIT_MS;
process.env.DATA_DIR = dataDir;
// Deterministic factory defaults regardless of the developer's shell.
delete process.env.RATE_LIMIT_EXECUTION_MAX_WAIT_MS;
delete process.env.RATE_LIMIT_MAX_WAIT_MS;

const db = await import("../src/lib/db/core.ts");
const settingsDb = await import("../src/lib/db/settings.ts");
const {
  DEFAULT_REQUEST_QUEUE_EXECUTION_MAX_WAIT_MS,
  DEFAULT_RESILIENCE_SETTINGS,
  resolveResilienceSettings,
} = await import("../src/lib/resilience/settings.ts");
const { normalizeRequestQueueSettings } = await import(
  "../src/lib/resilience/settings/normalize.ts"
);
const { updateResilienceSchema } = await import("../src/shared/validation/schemas/settings.ts");
const { validateBody, isValidationFailure } = await import("../src/shared/validation/helpers.ts");

test.after(() => {
  db.resetDbInstance();
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  restore("DATA_DIR", originalDataDir);
  restore("RATE_LIMIT_EXECUTION_MAX_WAIT_MS", originalExecOverride);
  restore("RATE_LIMIT_MAX_WAIT_MS", originalWaitOverride);
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("the execution backstop default is 10 minutes and independent of the queue-wait default", () => {
  assert.equal(DEFAULT_REQUEST_QUEUE_EXECUTION_MAX_WAIT_MS, 600_000);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.executionMaxWaitMs, 600_000);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.maxWaitMs, 15_000);
});

test("normalizeRequestQueueSettings keeps the two budgets mutually independent", () => {
  const fallback = DEFAULT_RESILIENCE_SETTINGS.requestQueue;

  // Raising the queue-wait budget must NOT move the execution backstop.
  const waitOnly = normalizeRequestQueueSettings({ maxWaitMs: 120_000 }, fallback);
  assert.equal(waitOnly.maxWaitMs, 120_000);
  assert.equal(waitOnly.executionMaxWaitMs, fallback.executionMaxWaitMs);

  // And vice versa.
  const execOnly = normalizeRequestQueueSettings({ executionMaxWaitMs: 900_000 }, fallback);
  assert.equal(execOnly.executionMaxWaitMs, 900_000);
  assert.equal(execOnly.maxWaitMs, fallback.maxWaitMs);

  // Out-of-range values clamp rather than corrupt the shape.
  const clamped = normalizeRequestQueueSettings({ executionMaxWaitMs: -5 }, fallback);
  assert.equal(clamped.executionMaxWaitMs, fallback.executionMaxWaitMs);
});

test("updateResilienceSchema accepts requestQueue.executionMaxWaitMs", () => {
  const validation = validateBody(updateResilienceSchema, {
    requestQueue: { executionMaxWaitMs: 300_000 },
  });
  assert.equal(isValidationFailure(validation), false);

  const invalid = validateBody(updateResilienceSchema, {
    requestQueue: { executionMaxWaitMs: 0 },
  });
  assert.equal(isValidationFailure(invalid), true, "must be >= 1ms");
});

test("a persisted executionMaxWaitMs is surfaced by resolveResilienceSettings", async () => {
  await settingsDb.updateSettings({
    resilienceSettings: { requestQueue: { executionMaxWaitMs: 240_000 } },
  });
  const resolved = resolveResilienceSettings(await settingsDb.getSettings());
  assert.equal(resolved.requestQueue.executionMaxWaitMs, 240_000);
  assert.equal(
    resolved.requestQueue.maxWaitMs,
    DEFAULT_RESILIENCE_SETTINGS.requestQueue.maxWaitMs
  );
});
