import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

test("usage modules do not initialize storage or schedule rotation during import", () => {
  const historySource = fs.readFileSync(
    path.join(packageRoot, "src/lib/usage/usageHistory.ts"),
    "utf8",
  );
  const callLogsSource = fs.readFileSync(
    path.join(packageRoot, "src/lib/usage/callLogs.ts"),
    "utf8",
  );
  const persistenceSource = fs.readFileSync(
    path.join(packageRoot, "src/lib/usage/persistence.ts"),
    "utf8",
  );

  assert.doesNotMatch(historySource, /from ["'].\/migrations(?:\.js)?["']/);
  assert.doesNotMatch(callLogsSource, /from ["'].\/migrations(?:\.js)?["']/);
  assert.doesNotMatch(
    callLogsSource,
    /if\s*\(shouldPersistToDisk[\s\S]*?scheduleCallLogRotation\(\);\s*\}/,
  );
  assert.doesNotMatch(persistenceSource, /db\/core|\.\/migrations/);
});

test("edge bootstrap waits for usage storage before loading request modules", () => {
  const bootstrapSource = fs.readFileSync(
    path.join(packageRoot, "../../apps/edge-gateway/src/bootstrap.ts"),
    "utf8",
  );
  const initializationIndex = bootstrapSource.indexOf("await initializeUsageStorage()");
  const appModuleIndex = bootstrapSource.indexOf('await import("./app.module.js")');

  assert.notEqual(initializationIndex, -1);
  assert.notEqual(appModuleIndex, -1);
  assert.ok(initializationIndex < appModuleIndex);
});

test("usage storage initialization is explicit and idempotent", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-storage-init-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;

  try {
    const migrations = await import(
      `../src/lib/usage/migrations.ts?usage-storage-test=${Date.now()}`
    );

    assert.equal(fs.existsSync(path.join(dataDir, "storage.sqlite")), false);

    const first = migrations.initializeUsageStorage();
    const second = migrations.initializeUsageStorage();
    assert.strictEqual(second, first);
    await first;

    assert.equal(fs.existsSync(path.join(dataDir, "storage.sqlite")), true);

    const { closeDbInstance } = await import("../src/lib/db/core.ts");
    closeDbInstance({ checkpointMode: null });
  } finally {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
