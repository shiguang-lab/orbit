import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";

/**
 * SQLite schema owned by the control-plane eval module.
 *
 * The entity metadata for these tables is published from packages/db-schema;
 * this app owns the concrete DDL because only control-api creates and updates
 * suites, cases, and run history.
 */
const EVALS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  run_group_id TEXT,
  suite_id TEXT NOT NULL,
  suite_name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT NOT NULL,
  api_key_id TEXT,
  pass_rate INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  outputs_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eval_runs_suite_created_at
  ON eval_runs(suite_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_group_id
  ON eval_runs(run_group_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_created_at
  ON eval_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS eval_suites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eval_suites_updated_at
  ON eval_suites(updated_at DESC);

CREATE TABLE IF NOT EXISTS eval_cases (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  model TEXT,
  input_json TEXT NOT NULL,
  expected_strategy TEXT NOT NULL,
  expected_value TEXT,
  tags_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eval_cases_suite_order
  ON eval_cases(suite_id, sort_order ASC, created_at ASC);
`;

function hasColumn(table: string, column: string): boolean {
  const rows = getDbInstance()
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name?: unknown }>;
  return rows.some((row) => row && row.name === column);
}

/** Ensure eval tables exist for both fresh and previously migrated databases. */
export function ensureEvalsSchema(): void {
  const db = getDbInstance();
  db.exec(EVALS_SCHEMA_SQL);

  // Older installations may have created the tables before all optional
  // columns were introduced. Keep startup additive and data-preserving.
  const suiteColumns: Array<[string, string]> = [
    ["description", "TEXT"],
    ["created_at", "TEXT NOT NULL DEFAULT ''"],
    ["updated_at", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [column, definition] of suiteColumns) {
    if (!hasColumn("eval_suites", column)) {
      db.exec(`ALTER TABLE eval_suites ADD COLUMN ${column} ${definition}`);
    }
  }

  const caseColumns: Array<[string, string]> = [
    ["sort_order", "INTEGER NOT NULL DEFAULT 0"],
    ["model", "TEXT"],
    ["input_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["expected_strategy", "TEXT NOT NULL DEFAULT 'contains'"],
    ["expected_value", "TEXT"],
    ["tags_json", "TEXT"],
    ["created_at", "TEXT NOT NULL DEFAULT ''"],
    ["updated_at", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [column, definition] of caseColumns) {
    if (!hasColumn("eval_cases", column)) {
      db.exec(`ALTER TABLE eval_cases ADD COLUMN ${column} ${definition}`);
    }
  }
}
