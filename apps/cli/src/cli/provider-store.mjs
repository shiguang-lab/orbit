import { decryptCredential } from "./encryption.mjs";

function parseJsonObject(value) {
  if (!value || typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function rowToConnection(row) {
  return {
    id: row.id,
    provider: row.provider,
    authType: row.auth_type || "oauth",
    name: row.name || row.display_name || row.email || row.provider,
    email: row.email || null,
    priority: row.priority || 0,
    isActive: row.is_active !== 0,
    apiKey: row.api_key || null,
    accessToken: row.access_token || null,
    refreshToken: row.refresh_token || null,
    idToken: row.id_token || null,
    providerSpecificData: parseJsonObject(row.provider_specific_data),
    testStatus: row.test_status || "unknown",
    defaultModel: row.default_model || null,
    lastTested: row.last_tested || null,
    lastError: row.last_error || null,
    updatedAt: row.updated_at || null,
    createdAt: row.created_at || null,
  };
}

export function listProviderConnections(db) {
  const table = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'provider_connections'"
  ).get();
  if (!table) return [];
  return db
    .prepare(
      `SELECT * FROM provider_connections
       ORDER BY provider ASC, priority ASC, updated_at DESC`
    )
    .all()
    .map(rowToConnection);
}

export function findProviderConnection(db, selector) {
  const normalized = String(selector || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  const connections = listProviderConnections(db);
  return (
    connections.find((connection) => connection.id.toLowerCase() === normalized) ||
    connections.find((connection) => connection.id.toLowerCase().startsWith(normalized)) ||
    connections.find((connection) => String(connection.name || "").toLowerCase() === normalized) ||
    connections.find((connection) => connection.provider.toLowerCase() === normalized) ||
    null
  );
}

export function getProviderApiKey(connection) {
  if (connection.authType !== "apikey") {
    throw new Error(`Connection ${connection.name} is not an API-key provider.`);
  }
  if (!connection.apiKey) {
    throw new Error(`Connection ${connection.name} has no API key configured.`);
  }
  return decryptCredential(connection.apiKey);
}
