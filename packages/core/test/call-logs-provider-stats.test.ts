import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { toNumberOrNull } from "@orbit/contracts/numeric";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-call-logs-stats-"));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = "test";
process.env.DISABLE_SQLITE_AUTO_BACKUP = "true";

const core = await import("../src/lib/db/core.ts");
const stats = await import("../src/lib/db/callLogStats.ts");

function resetDb() {
  core.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(dataDir, { recursive: true });
}

test.beforeEach(() => {
  resetDb();
});

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/**
 * Regression guard for #12832: an empty table must read as "no data", not as a
 * measured zero. `SUM(...)` over zero rows is NULL, which used to leak out.
 */
test("getFallbackStats on an empty DB returns zeros, not nulls", () => {
  core.getDbInstance();
  const row = stats.getFallbackStats("", {});
  assert.deepEqual(row, {
    total: 0,
    with_requested: 0,
    fallback_eligible: 0,
    fallbacks: 0,
  });
});

test("avgLatencyMs stays null when no duration was recorded", () => {
  const db = core.getDbInstance();
  const now = new Date().toISOString();
  // #10714: getProviderMetrics hides providers with no live connection row.
  db.prepare(
    `INSERT INTO provider_connections (id, provider, created_at, updated_at) VALUES ('conn-1', 'openai', ?, ?)`
  ).run(now, now);
  db.prepare(
    `INSERT INTO call_logs (id, timestamp, provider, status, duration)
     VALUES ('log-1', ?, 'openai', 200, NULL)`
  ).run(now);

  const rows = stats.getProviderMetrics();
  assert.equal(rows.length, 1);
  assert.equal(toNumberOrNull(rows[0].avgLatencyMs), null);
});

test("error_type NULL splits into pre_migration vs unclassified by timestamp", () => {
  const db = core.getDbInstance();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO call_logs (id, timestamp, provider, status, error_type)
     VALUES ('old-1', '2026-08-01T00:00:00.000Z', 'openai', 500, NULL),
            ('new-1', ?, 'openai', 500, NULL)`
  ).run(now);

  const breakdown = stats.getErrorTypeBreakdown("", {});
  const byType = new Map(breakdown.map((b) => [b.errorType, b.count]));
  assert.equal(byType.get("pre_migration"), 1);
  assert.equal(byType.get("unclassified"), 1);
});

test("migration 176 creates the provider GROUP BY indexes used by the stats queries", () => {
  const db = core.getDbInstance();

  const names = (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as Array<{
      name: string;
    }>
  ).map((r) => r.name);
  assert.ok(
    names.includes("idx_cl_provider_timestamp"),
    "idx_cl_provider_timestamp must exist after migrations"
  );
  assert.ok(
    names.includes("idx_cl_request_provider"),
    "idx_cl_request_provider must exist after migrations"
  );

  const plan = (
    db
      .prepare(
        "EXPLAIN QUERY PLAN SELECT provider, COUNT(*), AVG(duration) FROM call_logs WHERE request_type = 'search' GROUP BY provider"
      )
      .all() as Array<{ detail: string }>
  )
    .map((r) => r.detail)
    .join(" | ");
  assert.ok(
    plan.includes("USING INDEX idx_cl_request_provider"),
    `planner must use idx_cl_request_provider, got: ${plan}`
  );
  assert.ok(!plan.includes("SCAN TABLE"), `must not table-scan, got: ${plan}`);
});
