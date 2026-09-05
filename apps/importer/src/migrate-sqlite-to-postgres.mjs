#!/usr/bin/env node

/**
 * Convert a frozen SQLite snapshot into the independent PostgreSQL database.
 *
 * The source is opened read-only and is never modified.  Tables and column
 * names are preserved in the `gateway` schema so a migration is auditable and
 * deterministic.  This command intentionally requires an explicit
 * `--replace-schema` before replacing an existing target schema.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: node apps/importer/src/migrate-sqlite-to-postgres.mjs --source-sqlite <file> [--database-url <url>] [--schema gateway] [--replace-schema]",
  );
  process.exitCode = 2;
}

function parseArgs(argv) {
  const args = {
    source: null,
    databaseUrl: process.env.POSTGRES_URL || process.env.DATABASE_URL || null,
    schema: "gateway",
    replaceSchema: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--replace-schema") {
      args.replaceSchema = true;
      continue;
    }
    if (token === "--source-sqlite" || token === "--database-url" || token === "--schema") {
      const value = argv[++index];
      if (!value) return usage(`${token} requires a value`);
      if (token === "--source-sqlite") args.source = value;
      else if (token === "--database-url") args.databaseUrl = value;
      else args.schema = value;
      continue;
    }
    return usage(`unknown argument: ${token}`);
  }
  if (!args.source) return usage("--source-sqlite is required");
  if (!args.databaseUrl) return usage("--database-url or POSTGRES_URL/DATABASE_URL is required");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(args.schema)) return usage("schema must be a simple identifier");
  return args;
}

function postgresType(declaredType, rows = [], columnName = "") {
  const type = String(declaredType || "").toUpperCase();
  const values = rows.map((row) => row[columnName]).filter((value) => value !== null && value !== undefined);
  if (values.length > 0 && values.every((value) => value instanceof Uint8Array)) return "BYTEA";
  if (type.includes("INT")) {
    const hasFraction = rows.some((row) => {
      const value = row[columnName];
      return typeof value === "number" && !Number.isInteger(value);
    });
    return hasFraction ? "NUMERIC" : "BIGINT";
  }
  if (type.includes("CHAR") || type.includes("CLOB") || type.includes("TEXT")) return "TEXT";
  if (type.includes("REAL") || type.includes("FLOA") || type.includes("DOUB")) return "DOUBLE PRECISION";
  if (type.includes("BLOB")) return "BYTEA";
  // SQLite stores dates, JSON and booleans in multiple representations. Keep
  // their exact textual representation; domain-level casting belongs to the
  // PostgreSQL repositories, not to a lossy import.
  return "TEXT";
}

function normalizeValue(value) {
  if (value === undefined) return null;
  if (value instanceof Uint8Array && !Buffer.isBuffer(value)) return Buffer.from(value);
  return value;
}

function rowChecksum(rows, names) {
  const serialized = rows.map((row) => JSON.stringify(names.map((name) => {
    const value = row[name];
    if (value === null || value === undefined) return null;
    if (value instanceof Uint8Array) return { blob: Buffer.from(value).toString("base64") };
    return String(value);
  }))).sort();
  const hash = createHash("sha256");
  for (const row of serialized) hash.update(row).update("\n");
  return hash.digest("hex");
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

function sourceTables(db) {
  return db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .filter((table) => !/^CREATE\s+VIRTUAL\s+TABLE/i.test(String(table.sql || "")));
}

function skippedVirtualTables(db) {
  return db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .filter((table) => /^CREATE\s+VIRTUAL\s+TABLE/i.test(String(table.sql || "")))
    .map((table) => ({ tableName: String(table.name), reason: "virtual table requires PostgreSQL-native index rebuild" }));
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args) return;
  const sourcePath = args.source;
  const sourceHash = await sha256(sourcePath);
  // Preserve 64-bit SQLite INTEGER values instead of coercing them through
  // JavaScript's 53-bit Number range.
  const sqlite = new DatabaseSync(sourcePath, { readOnly: true, readBigInts: true });
  const client = new Client({ connectionString: args.databaseUrl });
  const schema = quoteIdentifier(args.schema);
  let importedRows = 0;
  const manifest = [];
  const skipped = skippedVirtualTables(sqlite);

  try {
    const integrity = sqlite.prepare("PRAGMA integrity_check").get();
    if ((integrity?.integrity_check ?? integrity?.["integrity_check"]) !== "ok") {
      throw new Error(`SQLite integrity_check failed: ${JSON.stringify(integrity)}`);
    }
    await client.connect();

    await client.query("BEGIN");
    if (args.replaceSchema) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } else {
      const existing = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [args.schema]);
      if (existing.rowCount > 0) {
        throw new Error(`target schema ${args.schema} already exists; rerun with --replace-schema`);
      }
    }
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`
      CREATE TABLE ${schema}."_migration_runs" (
        id BIGSERIAL PRIMARY KEY,
        source_path TEXT NOT NULL,
        source_sha256 TEXT NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        table_count INTEGER NOT NULL,
        row_count BIGINT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE ${schema}."_table_manifest" (
        table_name TEXT PRIMARY KEY,
        source_columns INTEGER NOT NULL,
        source_rows BIGINT NOT NULL,
        imported_rows BIGINT NOT NULL,
        source_row_sha256 TEXT NOT NULL,
        imported_row_sha256 TEXT NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE TABLE ${schema}."_skipped_tables" (table_name TEXT PRIMARY KEY, reason TEXT NOT NULL)`);
    for (const table of skipped) await client.query(`INSERT INTO ${schema}."_skipped_tables" (table_name, reason) VALUES ($1, $2)`, [table.tableName, table.reason]);

    for (const table of sourceTables(sqlite)) {
      const tableName = String(table.name);
      const columns = sqlite.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all();
      if (columns.length === 0) continue;
      const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all();
      const columnDefinitions = columns
        .map((column) => `${quoteIdentifier(column.name)} ${postgresType(column.type, rows, column.name)}`)
      const primaryKey = columns
        .filter((column) => Number(column.pk) > 0)
        .sort((left, right) => Number(left.pk) - Number(right.pk))
        .map((column) => quoteIdentifier(column.name));
      if (primaryKey.length > 0) columnDefinitions.push(`PRIMARY KEY (${primaryKey.join(", ")})`);
      await client.query(`CREATE TABLE ${schema}.${quoteIdentifier(tableName)} (${columnDefinitions.join(", ")})`);
      const names = columns.map((column) => String(column.name));
      const maxRows = Math.max(1, Math.floor(60000 / names.length));
      for (let offset = 0; offset < rows.length; offset += maxRows) {
        const batch = rows.slice(offset, offset + maxRows);
        const values = [];
        const tuples = batch.map((row, rowIndex) => {
          const placeholders = names.map((name, columnIndex) => {
            values.push(normalizeValue(row[name]));
            return `$${rowIndex * names.length + columnIndex + 1}`;
          });
          return `(${placeholders.join(", ")})`;
        });
        await client.query(
          `INSERT INTO ${schema}.${quoteIdentifier(tableName)} (${names.map(quoteIdentifier).join(", ")}) VALUES ${tuples.join(", ")}`,
          values,
        );
      }
      const targetRows = (await client.query(`SELECT * FROM ${schema}.${quoteIdentifier(tableName)}`)).rows;
      const sourceRowSha256 = rowChecksum(rows, names);
      const importedRowSha256 = rowChecksum(targetRows, names);
      if (targetRows.length !== rows.length || importedRowSha256 !== sourceRowSha256) {
        throw new Error(`target verification failed for ${tableName}: row count or value checksum mismatch`);
      }
      importedRows += targetRows.length;
      manifest.push({ tableName, columns: columns.length, rows: rows.length, sourceRowSha256, importedRowSha256 });
      await client.query(
        `INSERT INTO ${schema}."_table_manifest" (table_name, source_columns, source_rows, imported_rows, source_row_sha256, imported_row_sha256) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tableName, columns.length, rows.length, targetRows.length, sourceRowSha256, importedRowSha256],
      );
    }

    await client.query(
      `INSERT INTO ${schema}."_migration_runs" (source_path, source_sha256, table_count, row_count) VALUES ($1, $2, $3, $4)`,
      [sourcePath, sourceHash, manifest.length, importedRows],
    );
    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          status: "ok",
          schema: args.schema,
          sourceSqlite: sourcePath,
          sourceSha256: sourceHash,
          tables: manifest.length,
          rows: importedRows,
          skippedVirtualTables: skipped,
          tableManifest: manifest,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    sqlite.close();
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
