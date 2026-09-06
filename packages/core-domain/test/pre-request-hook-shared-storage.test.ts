import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("persisted hooks execute and logs remain visible across fresh DB connections", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hook-process-boundary-"));
  process.env.DATA_DIR = dataDir;
  const core = await import("../src/lib/db/core.js");
  t.after(() => {
    core.resetDbInstance();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const controlStore = await import("../src/lib/db/middleware.js");
  controlStore.createMiddlewareHook({
    name: "cross_process_hook",
    description: "shared storage contract",
    priority: 100,
    scope: { type: "global" },
    enabled: true,
    code: 'return { body: { persistedHookRan: true }, model: "persisted-model" };',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runCount: 0,
  });

  core.resetDbInstance();
  const edgeExecution = await import("../src/middleware/preRequestHookExecution.js");
  const result = await edgeExecution.runHooks(
    edgeExecution.createHookContext({ body: {}, headers: {}, model: "original-model" }),
  );
  assert.equal(result.context.body.persistedHookRan, true);
  assert.equal(result.context.model, "persisted-model");

  controlStore.updateMiddlewareHook("cross_process_hook", {
    code: 'return { body: { refreshedHookRan: true }, model: "refreshed-model" };',
  });
  const refreshed = await edgeExecution.runHooks(
    edgeExecution.createHookContext({ body: {}, headers: {}, model: "original-model" }),
  );
  assert.equal(refreshed.context.body.refreshedHookRan, true);
  assert.equal(refreshed.context.model, "refreshed-model");

  core.resetDbInstance();
  const persisted = controlStore.getMiddlewareHook("cross_process_hook");
  assert.equal(persisted?.runCount, 2);
  assert.equal(persisted?.lastError, undefined);
  const logs = controlStore.getHookLogs("cross_process_hook", 10);
  assert.equal(logs.length, 2);
  assert.equal(logs[0]?.mutated, true);
  assert.equal(logs[0]?.error, null);
});
