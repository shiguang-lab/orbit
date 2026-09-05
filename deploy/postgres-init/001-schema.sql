-- Bootstrap only. Data is loaded by the explicit SQLite snapshot migration
-- command; this file must never contain production credentials or seed rows.
CREATE SCHEMA IF NOT EXISTS gateway;

CREATE TABLE IF NOT EXISTS gateway._migration_runs (
  id BIGSERIAL PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_count INTEGER NOT NULL,
  row_count BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS gateway._table_manifest (
  table_name TEXT PRIMARY KEY,
  source_columns INTEGER NOT NULL,
  source_rows BIGINT NOT NULL,
  imported_rows BIGINT NOT NULL,
  source_row_sha256 TEXT NOT NULL,
  imported_row_sha256 TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gateway._skipped_tables (
  table_name TEXT PRIMARY KEY,
  reason TEXT NOT NULL
);
