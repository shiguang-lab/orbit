CREATE TABLE IF NOT EXISTS service_nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  report_token_hash TEXT NOT NULL,
  latest_report TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL
);
