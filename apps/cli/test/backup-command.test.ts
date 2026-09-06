import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("scheduled backup commands reject unavailable adapters and preserve corrupt configuration", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-cli-policy-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  t.after(() => {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const commands = await import("../src/cli/commands/backup.mjs");

  assert.equal(await commands.runBackupAutoEnableCommand({ cloud: true }), 1);
  assert.equal(await commands.runBackupAutoEnableCommand({ encrypt: true }), 1);
  assert.equal(fs.existsSync(path.join(dataDir, "backup-schedule.json")), false);

  const corrupt = "{not-json";
  fs.writeFileSync(path.join(dataDir, "backup-schedule.json"), corrupt);
  assert.equal(await commands.runBackupAutoStatusCommand(), 1);
  assert.equal(await commands.runBackupAutoDisableCommand(), 1);
  assert.equal(fs.readFileSync(path.join(dataDir, "backup-schedule.json"), "utf8"), corrupt);
});
