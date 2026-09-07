/** Canonical DDL for the shared proxy registry and scope-pool tables. */
export const PROXY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS proxy_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  region TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'manual',
  quality_score INTEGER,
  latency_ms INTEGER,
  anonymity TEXT,
  google_access INTEGER DEFAULT 0,
  last_validated TEXT,
  country_code TEXT,
  family TEXT NOT NULL DEFAULT 'auto',
  subscription_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_proxy_registry_status ON proxy_registry(status);
CREATE INDEX IF NOT EXISTS idx_proxy_registry_host ON proxy_registry(host);
CREATE INDEX IF NOT EXISTS idx_proxy_registry_source ON proxy_registry(source);
CREATE INDEX IF NOT EXISTS idx_proxy_registry_subscription ON proxy_registry(subscription_id);
CREATE TABLE IF NOT EXISTS proxy_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proxy_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  scope_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope, scope_id, proxy_id),
  FOREIGN KEY (proxy_id) REFERENCES proxy_registry(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_proxy_assignments_proxy_id ON proxy_assignments(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignments_scope ON proxy_assignments(scope, scope_id);
CREATE TABLE IF NOT EXISTS proxy_scope_rotation (
  scope TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'round-robin',
  cursor INTEGER NOT NULL DEFAULT 0,
  sticky_window_minutes INTEGER NOT NULL DEFAULT 30,
  rotated_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (scope, scope_id)
);
CREATE TABLE IF NOT EXISTS proxy_subscriptions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'global',
  rule_providers TEXT,
  local_core_endpoint TEXT,
  update_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_fetched_at TEXT,
  status TEXT NOT NULL DEFAULT 'empty',
  error TEXT,
  last_nodes TEXT,
  last_error_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_proxy_subscriptions_enabled ON proxy_subscriptions(enabled);
CREATE INDEX IF NOT EXISTS idx_proxy_subscriptions_last_error ON proxy_subscriptions(last_error_at);
`;

interface ProxySchemaExecutor {
  exec(sql: string): unknown;
}

/** Apply the shared proxy schema through an app-provided SQLite executor. */
export function ensureProxySchema(db: ProxySchemaExecutor): void {
  db.exec(PROXY_SCHEMA_SQL);
}
