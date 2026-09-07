-- Migration 170: Cliproxy instances table for multi-instance and distributed deployments
-- Supports local managed daemon as well as remote instances.

CREATE TABLE IF NOT EXISTS cliproxy_instances (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  endpoint          TEXT NOT NULL,
  management_key    TEXT,
  type              TEXT NOT NULL DEFAULT 'remote_agent', -- 'local_managed' | 'remote_agent'
  enabled           INTEGER NOT NULL DEFAULT 1,
  weight            INTEGER NOT NULL DEFAULT 100,
  tags              TEXT NOT NULL DEFAULT '[]',           -- JSON array of strings: ["us", "claude"]
  model_mappings    TEXT NOT NULL DEFAULT '{}',           -- JSON object: { "gpt-4o": "claude-3-5-sonnet" }
  status            TEXT NOT NULL DEFAULT 'unknown',      -- 'healthy' | 'unhealthy' | 'stopped' | 'unknown'
  last_health_check TEXT,
  latency_ms        INTEGER,
  version           TEXT,
  accounts_count    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cliproxy_instances_status ON cliproxy_instances(status);
CREATE INDEX IF NOT EXISTS idx_cliproxy_instances_enabled ON cliproxy_instances(enabled);

-- Seed default local instance 'cpa-local'
INSERT OR IGNORE INTO cliproxy_instances
  (id, name, endpoint, type, enabled, weight, tags, model_mappings, status)
VALUES
  ('cpa-local', '本地主实例', 'http://127.0.0.1:8317', 'local_managed', 1, 100, '["local"]', '{}', 'unknown');
