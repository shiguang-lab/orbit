import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-log-export-"));
process.env.DATA_DIR = testDataDir;
const core = await import("../src/lib/db/core.js");
const destinations = await import("../src/lib/db/logExportDestinations.js");

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("log export destination CRUD defaults to disabled and advances its cursor", () => {
  const created = destinations.createLogExportDestination({
    name: "warehouse",
    type: "bigquery",
    config: { projectId: "demo" },
  });
  assert.equal(created.enabled, false);
  assert.equal(created.includeBodies, false);
  assert.equal(created.cursorRowId, 0);

  destinations.advanceLogExportCursor(created.id, 12, 4);
  const advanced = destinations.getLogExportDestination(created.id)!;
  assert.equal(advanced.cursorRowId, 12);
  assert.equal(advanced.exportedTotal, 4);

  const updated = destinations.updateLogExportDestination(created.id, { enabled: true });
  assert.equal(updated?.enabled, true);
  assert.equal(destinations.getEnabledLogExportDestinations().length, 1);
  assert.equal(destinations.deleteLogExportDestination(created.id), true);
});
