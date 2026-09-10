import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { isTransientProbeError } from "../src/lib/db/probeUtils.js";

test("installs SQLite busy_timeout before enabling WAL", () => {
  const source = fs.readFileSync(new URL("../src/lib/db/core.ts", import.meta.url), "utf8");
  const open = source.indexOf("const db = openSqliteDatabase(sqliteFile)");
  const busy = source.indexOf('db.pragma("busy_timeout = 2000")', open);
  const wal = source.indexOf('db.pragma("journal_mode = WAL")', open);

  assert.notEqual(open, -1);
  assert.ok(busy > open, "busy_timeout must be configured on the primary connection");
  assert.ok(wal > busy, "busy_timeout must precede the first lock-taking WAL pragma");
});

test("recognizes driver-specific SQLite lock errors as transient", () => {
  assert.equal(isTransientProbeError(new Error("database is locked")), true);
  assert.equal(isTransientProbeError({ code: "SQLITE_BUSY" }), true);
  assert.equal(isTransientProbeError({ errcode: 5 }), true);
  assert.equal(isTransientProbeError({ errcode: 5 | (2 << 8) }), true);
  assert.equal(isTransientProbeError(new Error("database disk image is malformed")), false);
});
