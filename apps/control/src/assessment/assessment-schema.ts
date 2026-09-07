import { getDbInstance } from "@orbit/core/db/connection";

/**
 * SQLite schema for the control-plane model assessment engine.
 *
 * Entity metadata lives in packages/contracts/src/db-schema; this module owns the concrete
 * DDL and startup initialization because assessment data is only written by
 * control.  Keep this helper idempotent so existing installations can
 * start without a separate migration package.
 */
const ASSESSMENT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS model_assessments (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  latency_p50 INTEGER,
  latency_p95 INTEGER,
  success_rate REAL DEFAULT 0,
  supports_vision INTEGER DEFAULT 0,
  supports_tool_call INTEGER DEFAULT 0,
  supports_streaming INTEGER DEFAULT 0,
  supports_structured_output INTEGER DEFAULT 0,
  max_context_window INTEGER,
  max_output_tokens INTEGER,
  categories TEXT DEFAULT '[]',
  fitness_scores TEXT DEFAULT '{}',
  tier TEXT DEFAULT 'balanced',
  last_tested TEXT,
  last_error TEXT,
  consecutive_fails INTEGER DEFAULT 0,
  probe_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(model_id, provider_id)
);

CREATE TABLE IF NOT EXISTS assessment_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  models_tested INTEGER DEFAULT 0,
  models_passed INTEGER DEFAULT 0,
  models_failed INTEGER DEFAULT 0,
  models_rate_limited INTEGER DEFAULT 0,
  duration_ms INTEGER,
  trigger TEXT DEFAULT 'on_demand',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS combo_health (
  combo_id TEXT PRIMARY KEY,
  healthy_model_count INTEGER DEFAULT 0,
  dead_model_count INTEGER DEFAULT 0,
  total_model_count INTEGER DEFAULT 0,
  health_score REAL DEFAULT 0,
  last_auto_fix TEXT,
  auto_fix_count INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (combo_id) REFERENCES combos(id)
);

CREATE TABLE IF NOT EXISTS heal_actions (
  id TEXT PRIMARY KEY,
  combo_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_weight INTEGER,
  new_weight INTEGER,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (combo_id) REFERENCES combos(id)
);

CREATE INDEX IF NOT EXISTS idx_model_assessments_status ON model_assessments(status);
CREATE INDEX IF NOT EXISTS idx_model_assessments_provider ON model_assessments(provider_id);
CREATE INDEX IF NOT EXISTS idx_model_assessments_tier ON model_assessments(tier);
CREATE INDEX IF NOT EXISTS idx_model_assessments_last_tested ON model_assessments(last_tested);
CREATE INDEX IF NOT EXISTS idx_combo_health_health_score ON combo_health(health_score);
CREATE INDEX IF NOT EXISTS idx_heal_actions_combo_id ON heal_actions(combo_id);
CREATE INDEX IF NOT EXISTS idx_heal_actions_timestamp ON heal_actions(timestamp);
`;

/** Ensure assessment tables exist for fresh and previously migrated databases. */
export function ensureAssessmentSchema(): void {
  const db = getDbInstance();
  db.exec(ASSESSMENT_SCHEMA_SQL);
}

export { ASSESSMENT_SCHEMA_SQL };
