import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import type BetterSqlite3 from "better-sqlite3";

import { ensureProviderConnectionsColumns } from "../src/lib/db/schemaColumns.ts";

type SqliteDatabase = BetterSqlite3.Database;

const require_ = createRequire(import.meta.url);

function openMemoryDb(): SqliteDatabase {
  const BetterSqlite3 = require_("better-sqlite3") as typeof BetterSqlite3;
  return new BetterSqlite3(":memory:") as unknown as SqliteDatabase;
}

function hasColumn(db: SqliteDatabase, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
  return columns.some((entry) => String(entry.name ?? "") === column);
}

test("ensureProviderConnectionsColumns back-fills last_ping columns on a pre-123 lineage", () => {
  const db = openMemoryDb();
  try {
    db.exec("CREATE TABLE provider_connections (id TEXT PRIMARY KEY, provider TEXT NOT NULL)");
    assert.equal(hasColumn(db, "provider_connections", "last_ping_at"), false);
    assert.equal(hasColumn(db, "provider_connections", "last_pinged_reset_key"), false);

    ensureProviderConnectionsColumns(db);

    assert.equal(hasColumn(db, "provider_connections", "last_ping_at"), true);
    assert.equal(hasColumn(db, "provider_connections", "last_pinged_reset_key"), true);
    assert.doesNotThrow(() => ensureProviderConnectionsColumns(db));
  } finally {
    (db as unknown as { close?: () => void }).close?.();
  }
});
