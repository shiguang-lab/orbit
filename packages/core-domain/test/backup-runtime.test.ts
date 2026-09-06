import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDecipheriv, scryptSync } from "node:crypto";
import test from "node:test";

import { createBackup, readBackupSchedule, writeBackupSchedule } from "../src/lib/backup/runtime.ts";

test("backup runtime creates a manifest, supports exclusion, encryption, and retention", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-runtime-"));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dataDir, "settings.json"), '{"secret":"value"}');
  fs.writeFileSync(path.join(dataDir, "providers.json"), "[]");

  const first = await createBackup({ dataDir, name: "first", exclude: ["providers*"] });
  assert.equal(first.backedUp, 1);
  assert.equal(first.skipped, 3);
  assert.deepEqual(first.manifest?.files, ["settings.json"]);
  assert.equal(fs.readFileSync(path.join(first.backupPath, "settings.json"), "utf8"), '{"secret":"value"}');

  const encrypted = await createBackup({ dataDir, name: "second", encrypt: true, passphrase: "test-key" });
  assert.equal(encrypted.encrypted, true);
  assert.ok(fs.existsSync(path.join(encrypted.backupPath, "settings.json.enc")));
  assert.notEqual(fs.readFileSync(path.join(encrypted.backupPath, "settings.json.enc"), "utf8"), '{"secret":"value"}');

  await createBackup({ dataDir, name: "third", retention: 2 });
  assert.deepEqual(
    fs.readdirSync(path.join(dataDir, "backups")).sort(),
    ["shiguangGateway-backup-second", "shiguangGateway-backup-third"],
  );
});

test("backup runtime creates a consistent SQLite snapshot while WAL is active", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-sqlite-"));
  const { DatabaseSync } = await import("node:sqlite");
  const source = new DatabaseSync(path.join(dataDir, "storage.sqlite"));
  t.after(() => {
    try {
      source.close();
    } catch {}
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  source.exec("PRAGMA journal_mode=WAL; CREATE TABLE items (value TEXT); INSERT INTO items VALUES ('preserved')");

  const result = await createBackup({ dataDir, name: "sqlite" });
  const snapshot = new DatabaseSync(path.join(result.backupPath, "storage.sqlite"), { readOnly: true });
  try {
    assert.deepEqual({ ...snapshot.prepare("SELECT value FROM items").get() }, { value: "preserved" });
    assert.equal(Object.values(snapshot.prepare("PRAGMA quick_check").get() ?? {})[0], "ok");
  } finally {
    snapshot.close();
  }

  const encrypted = await createBackup({
    dataDir,
    name: "sqlite-encrypted",
    encrypt: true,
    passphrase: "sqlite-test-key",
  });
  const encryptedPath = path.join(encrypted.backupPath, "storage.sqlite.enc");
  assert.equal(fs.existsSync(path.join(encrypted.backupPath, "storage.sqlite")), false);
  const payload = fs.readFileSync(encryptedPath);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync("sqlite-test-key", payload.subarray(0, 16), 32),
    payload.subarray(16, 28),
  );
  decipher.setAuthTag(payload.subarray(28, 44));
  const decryptedPath = path.join(dataDir, "decrypted.sqlite");
  fs.writeFileSync(decryptedPath, Buffer.concat([decipher.update(payload.subarray(44)), decipher.final()]));
  const decrypted = new DatabaseSync(decryptedPath, { readOnly: true });
  try {
    assert.deepEqual({ ...decrypted.prepare("SELECT value FROM items").get() }, { value: "preserved" });
  } finally {
    decrypted.close();
  }
});

test("backup schedule persistence has one shared JSON contract", (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-schedule-"));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  writeBackupSchedule({ enabled: true, cron: "0 3 * * *", retention: 5 }, dataDir);
  assert.deepEqual(readBackupSchedule(dataDir), { enabled: true, cron: "0 3 * * *", retention: 5 });
});

test("CLI schedule commands reject unsupported adapters and preserve corrupt configuration", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-cli-policy-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  t.after(() => {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const commands = await import("../bin/cli/commands/backup.mjs");

  assert.equal(await commands.runBackupAutoEnableCommand({ cloud: true }), 1);
  assert.equal(await commands.runBackupAutoEnableCommand({ encrypt: true }), 1);
  assert.equal(fs.existsSync(path.join(dataDir, "backup-schedule.json")), false);

  const corrupt = "{not-json";
  fs.writeFileSync(path.join(dataDir, "backup-schedule.json"), corrupt);
  assert.equal(await commands.runBackupAutoStatusCommand(), 1);
  assert.equal(await commands.runBackupAutoDisableCommand(), 1);
  assert.equal(fs.readFileSync(path.join(dataDir, "backup-schedule.json"), "utf8"), corrupt);
});
