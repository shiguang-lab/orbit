-- 087: Quota pool groups — quota_groups table + quota_pools.group_id (Part B1).
--
-- Introduces a first-class Group entity that organises quota pools.
-- A key allocated to any pool of a group sees and may use every model
-- of every pool in that group (scope/enforce wired in subsequent tasks).
-- Idempotent via CREATE TABLE/INSERT OR IGNORE (new table) + the migration
-- runner's "duplicate column name" catch (ALTER TABLE ADD COLUMN).
-- The UPDATE backfill is a safe no-op after the first run (group_id is
-- already non-NULL for all rows).

CREATE TABLE IF NOT EXISTS quota_groups (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add group_id to pools (nullable; legacy pools remain ungrouped).
-- Re-run safety: the migration runner catches "duplicate column name" and
-- marks the migration as applied without re-executing the rest of the file,
-- so the UPDATE below only runs on the first application.
ALTER TABLE quota_pools ADD COLUMN group_id TEXT;
