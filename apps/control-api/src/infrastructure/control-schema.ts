import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";

/**
 * Tables owned exclusively by control-api.  They intentionally live beside
 * the owning Nest app; packages/db-schema contains only their canonical
 * entity metadata and ownership declaration.
 */
const CONTROL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS config_audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  diff_json TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_config_audit_log_target_created ON config_audit_log(target, timestamp);
CREATE INDEX IF NOT EXISTS idx_config_audit_log_created ON config_audit_log(timestamp);

CREATE TABLE IF NOT EXISTS playground_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  system TEXT,
  params_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_playground_presets_name ON playground_presets(name);
CREATE INDEX IF NOT EXISTS idx_playground_presets_endpoint ON playground_presets(endpoint);

CREATE TABLE IF NOT EXISTS plugin_metrics (
  plugin_name TEXT NOT NULL,
  event TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  total_duration_ms REAL NOT NULL DEFAULT 0,
  last_called_at TEXT,
  PRIMARY KEY (plugin_name, event)
);
`;

/** Ensure all control-api-owned tables exist after the shared runtime starts. */
export function ensureControlSchema(): void {
  getDbInstance().exec(CONTROL_SCHEMA_SQL);
}
