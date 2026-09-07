import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";
import { ensureLoginGuardSchema } from "../auth/login.guard.js";

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

CREATE TABLE IF NOT EXISTS inspector_sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  request_count INTEGER NOT NULL DEFAULT 0,
  profile TEXT CHECK (profile IN ('llm','custom','all'))
);

CREATE TABLE IF NOT EXISTS inspector_session_requests (
  session_id TEXT NOT NULL REFERENCES inspector_sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (session_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_inspector_session_requests_sid
  ON inspector_session_requests(session_id);

CREATE TABLE IF NOT EXISTS inspector_custom_hosts (
  host TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('llm','app','custom')),
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_inspector_custom_hosts_enabled
  ON inspector_custom_hosts(enabled);
`;

/** Ensure all control-api-owned tables exist after the shared runtime starts. */
export function ensureControlSchema(): void {
  const database = getDbInstance();
  database.exec(CONTROL_SCHEMA_SQL);
  ensureLoginGuardSchema(database);
}
