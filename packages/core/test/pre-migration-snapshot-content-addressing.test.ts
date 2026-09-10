import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { tryOpenSync } from "../src/lib/db/adapters/driverFactory.ts";
import {
  createPreMigrationBackup,
  hashFileSync,
} from "../src/lib/db/migrationRunner/preMigrationBackup.ts";

test("content-addressed pre-migration snapshot reuses an identical DB state", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-premig-"));
  const dbPath = path.join(dataDir, "storage.sqlite");
  const db = tryOpenSync(dbPath);
  assert.ok(db);
  try {
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);");

    const first = createPreMigrationBackup(db);
    assert.ok(first, "snapshot should be created for a file-backed DB");
    assert.ok(fs.existsSync(first.path));
    assert.match(path.basename(first.path), /^db_state-[0-9a-f]{64}_pre-migration\.sqlite$/);
    assert.equal(hashFileSync(first.path), first.sha256);

    // Unchanged state → same content address, no second file.
    const second = createPreMigrationBackup(db);
    assert.ok(second);
    assert.equal(second.path, first.path);
    const backups = fs.readdirSync(path.join(dataDir, "db_backups")).filter((f) =>
      f.endsWith(".sqlite")
    );
    assert.equal(backups.length, 1, "unchanged state must not create a new snapshot file");

    // Changed state → new content-addressed snapshot.
    db.exec("INSERT INTO t (v) VALUES ('x');");
    const third = createPreMigrationBackup(db);
    assert.ok(third);
    assert.notEqual(third.sha256, first.sha256);
    const after = fs
      .readdirSync(path.join(dataDir, "db_backups"))
      .filter((f) => f.endsWith(".sqlite"));
    assert.equal(after.length, 2);
  } finally {
    db.close();
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 });
  }
});

test("in-memory databases skip snapshotting entirely", () => {
  const mem = tryOpenSync(":memory:");
  assert.ok(mem);
  try {
    mem.exec("CREATE TABLE t (id INTEGER PRIMARY KEY);");
    assert.equal(createPreMigrationBackup(mem), null);
  } finally {
    mem.close();
  }
});
