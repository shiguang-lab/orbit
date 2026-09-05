#!/usr/bin/env node

/** Run the migrated provider health surface against every active connection. */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const sourceDir = process.env.SHIGUANG_GATEWAY_SOURCE_DATA_DIR;
const controlUrl = (process.env.SHIGUANG_GATEWAY_CONTROL_URL ?? "http://127.0.0.1:8788").replace(/\/$/, "");
if (!sourceDir) {
  console.error("SHIGUANG_GATEWAY_SOURCE_DATA_DIR is required");
  process.exit(2);
}
const db = new DatabaseSync(path.join(sourceDir, "storage.sqlite"), { readOnly: true });
let key;
let connections;
try {
  key = db.prepare(`
    SELECT key FROM api_keys
    WHERE is_active = 1 AND (scopes LIKE '%"manage"%' OR scopes LIKE '%"admin"%')
    ORDER BY created_at DESC LIMIT 1
  `).get()?.key;
  connections = db.prepare("SELECT id, provider FROM provider_connections WHERE is_active = 1 ORDER BY priority, created_at").all();
} finally {
  db.close();
}
if (typeof key !== "string" || !key) throw new Error("source snapshot has no active management API key");
const results = [];
for (const connection of connections) {
  const response = await fetch(`${controlUrl}/api/providers/test-batch`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ mode: "selected", connectionIds: [connection.id] }),
  });
  const payload = await response.json().catch(() => ({}));
  const result = Array.isArray(payload.results) ? payload.results[0] : null;
  results.push({
    provider: connection.provider,
    status: response.status,
    valid: result?.valid === true,
    skipped: result?.skipped === true,
    error: typeof result?.error === "string" ? result.error : null,
    diagnosis: result?.diagnosis?.type ?? null,
    action:
      result?.diagnosis?.type === "upstream_auth_error" || result?.error === "Invalid API key"
        ? "reauthenticate_provider"
        : null,
  });
}
const failed = results.filter((result) => !result.valid);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length > 0) process.exitCode = 1;
