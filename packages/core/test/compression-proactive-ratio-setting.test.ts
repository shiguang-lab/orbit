import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-proactive-ratio-"));
process.env.DATA_DIR = testDataDir;

const core = await import("../src/lib/db/core.js");
const compression = await import("../src/lib/db/compression.js");

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("proactive compression ratio defaults to 0.7 and hot reloads after settings update", async () => {
  assert.equal(compression.getProactiveCompressionRatio(), 0.7);
  const settings = await compression.updateCompressionSettings({
    proactiveConfig: { thresholdRatio: 0.85 },
  });
  assert.equal(settings.proactiveConfig?.thresholdRatio, 0.85);
  assert.equal(compression.getProactiveCompressionRatio(), 0.85);
});

test("proactive compression ratio falls back for malformed persisted values", () => {
  core
    .getDbInstance()
    .prepare("UPDATE key_value SET value = ? WHERE namespace = ? AND key = ?")
    .run(JSON.stringify({ thresholdRatio: 1.5 }), "compression", "proactiveConfig");
  core.resetDbInstance();
  assert.equal(compression.getProactiveCompressionRatio(), 0.7);
});
