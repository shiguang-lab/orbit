import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { encryptCredential } from "./encryption.mjs";

const MANAGEMENT_PASSWORD_SALT_ROUNDS = 12;

export async function hashManagementPassword(password) {
  return bcrypt.hash(password, MANAGEMENT_PASSWORD_SALT_ROUNDS);
}

export function ensureBootstrapSchema(db) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS key_value (
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (namespace, key)
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS provider_connections (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      auth_type TEXT,
      name TEXT,
      email TEXT,
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      token_expires_at TEXT,
      scope TEXT,
      project_id TEXT,
      api_key TEXT,
      id_token TEXT,
      provider_specific_data TEXT,
      test_status TEXT,
      error_code TEXT,
      default_model TEXT,
      last_error TEXT,
      last_error_at TEXT,
      last_error_type TEXT,
      last_error_source TEXT,
      backoff_level INTEGER DEFAULT 0,
      rate_limited_until TEXT,
      health_check_interval INTEGER,
      last_health_check_at TEXT,
      last_tested TEXT,
      expires_in INTEGER,
      display_name TEXT,
      global_priority INTEGER,
      token_type TEXT,
      consecutive_use_count INTEGER DEFAULT 0,
      rate_limit_protection INTEGER DEFAULT 0,
      last_used_at TEXT,
      "group" TEXT,
      max_concurrent INTEGER,
      proxy_enabled INTEGER NOT NULL DEFAULT 1,
      per_key_proxy_enabled INTEGER NOT NULL DEFAULT 0,
      quota_visible INTEGER NOT NULL DEFAULT 1,
      quota_window_thresholds_json TEXT,
      rate_limit_overrides_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
}

export function getBootstrapSettings(db) {
  ensureBootstrapSchema(db);
  const rows = db.prepare("SELECT key, value FROM key_value WHERE namespace = 'settings'").all();
  return Object.fromEntries(rows.map((row) => {
    try { return [row.key, JSON.parse(row.value)]; } catch { return [row.key, row.value]; }
  }));
}

export function updateBootstrapSettings(db, updates) {
  ensureBootstrapSchema(db);
  const insert = db.prepare(
    "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('settings', ?, ?)"
  );
  db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) insert.run(key, JSON.stringify(value));
  })();
}

export function upsertBootstrapProvider(db, input) {
  ensureBootstrapSchema(db);
  const now = new Date().toISOString();
  const existing = db.prepare(
    "SELECT id, priority FROM provider_connections WHERE provider = ? AND auth_type = 'apikey' AND name = ?"
  ).get(input.provider, input.name || input.provider);
  const connection = {
    id: existing?.id || randomUUID(),
    provider: input.provider,
    name: input.name || input.provider,
    priority: existing?.priority || 1,
    apiKey: encryptCredential(input.apiKey),
    providerSpecificData: input.providerSpecificData ? JSON.stringify(input.providerSpecificData) : null,
    testStatus: input.testStatus || "unknown",
    defaultModel: input.defaultModel || null,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO provider_connections (
      id, provider, auth_type, name, priority, is_active, api_key, provider_specific_data,
      test_status, default_model, created_at, updated_at
    ) VALUES (
      @id, @provider, 'apikey', @name, @priority, 1, @apiKey, @providerSpecificData,
      @testStatus, @defaultModel, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      api_key = excluded.api_key,
      provider_specific_data = excluded.provider_specific_data,
      test_status = excluded.test_status,
      default_model = excluded.default_model,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at`
  ).run(connection);
  return { ...connection, authType: "apikey", isActive: true };
}

export function updateBootstrapProviderTestResult(db, connectionId, result) {
  const now = new Date().toISOString();
  const valid = result?.valid === true;
  db.prepare(
    `UPDATE provider_connections SET
      test_status = @testStatus,
      last_error = @lastError,
      last_error_at = @lastErrorAt,
      last_error_type = @lastErrorType,
      last_error_source = @lastErrorSource,
      error_code = @errorCode,
      last_tested = @lastTested,
      updated_at = @updatedAt
    WHERE id = @id`
  ).run({
    id: connectionId,
    testStatus: valid ? "active" : "error",
    lastError: valid ? null : result?.error || "Provider test failed",
    lastErrorAt: valid ? null : now,
    lastErrorType: valid ? null : "connection_test_failed",
    lastErrorSource: valid ? null : "upstream",
    errorCode: valid ? null : result?.statusCode || null,
    lastTested: now,
    updatedAt: now,
  });
}
