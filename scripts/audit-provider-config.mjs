#!/usr/bin/env node

/** Validate provider configuration that must exist before an independent cutover. */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const sourceDir = process.argv[2] ?? process.env.SHIGUANG_GATEWAY_SOURCE_DATA_DIR;
if (!sourceDir) {
  console.error("Usage: node scripts/audit-provider-config.mjs <source-data-dir>");
  process.exit(2);
}

const db = new DatabaseSync(path.join(sourceDir, "storage.sqlite"), { readOnly: true });
const issues = [];
const checked = [];
try {
  const rows = db.prepare(`
    SELECT id, provider, name, is_active, api_key, access_token, default_model, provider_specific_data
    FROM provider_connections
    WHERE is_active = 1
    ORDER BY priority, created_at
  `).all();
  for (const row of rows) {
    const provider = String(row.provider ?? "");
    let specific = {};
    if (row.provider_specific_data) {
      try { specific = JSON.parse(row.provider_specific_data); } catch { issues.push({ id: row.id, provider, code: "invalid_provider_specific_data" }); }
    }
    const item = { id: row.id, provider, name: row.name ?? null, active: true, checks: [] };
    if (provider.startsWith("openai-compatible-")) {
      const baseUrl = specific?.baseUrl;
      const validBaseUrl = typeof baseUrl === "string" && /^https:\/\//i.test(baseUrl);
      item.checks.push({ field: "providerSpecificData.baseUrl", present: validBaseUrl });
      if (!validBaseUrl) issues.push({ id: row.id, provider, code: "missing_https_base_url", action: "provide --provider-config-file overlay" });
      const hasCredential = Boolean(row.api_key || row.access_token);
      item.checks.push({ field: "credential", present: hasCredential });
      if (!hasCredential) issues.push({ id: row.id, provider, code: "missing_credential", action: "reauthenticate or provide credential" });
    } else {
      const hasCredential = Boolean(row.api_key || row.access_token);
      item.checks.push({ field: "credential", present: hasCredential });
      if (!hasCredential) issues.push({ id: row.id, provider, code: "missing_credential", action: "reauthenticate or provide credential" });
    }
    checked.push(item);
  }
} finally {
  db.close();
}

const result = { sourceDir: path.resolve(sourceDir), activeConnections: checked.length, checked, issues, status: issues.length ? "FAIL" : "PASS" };
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;
