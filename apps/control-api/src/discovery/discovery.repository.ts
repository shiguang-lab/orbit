import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";
import type { DiscoveryResult } from "./discovery.types.js";

interface DiscoveryRow {
  id: number;
  provider_id: string;
  method: string;
  endpoint: string | null;
  auth_type: string | null;
  models: string | null;
  rate_limit: string | null;
  feasibility: number | null;
  risk_level: string | null;
  status: string;
  notes: string | null;
  discovered_at: string;
  verified_at: string | null;
}

function rowToResult(row: DiscoveryRow): DiscoveryResult {
  let models: string[] | undefined;
  if (row.models) {
    try {
      const parsed: unknown = JSON.parse(row.models);
      if (Array.isArray(parsed)) models = parsed.map(String);
    } catch {
      models = undefined;
    }
  }
  return {
    id: row.id,
    providerId: row.provider_id,
    method: row.method as DiscoveryResult["method"],
    endpoint: row.endpoint,
    authType: (row.auth_type as DiscoveryResult["authType"]) ?? "none",
    models,
    rateLimit: row.rate_limit,
    feasibility: row.feasibility ?? 0,
    riskLevel: (row.risk_level as DiscoveryResult["riskLevel"]) ?? "none",
    status: row.status as DiscoveryResult["status"],
    notes: row.notes,
    discoveredAt: row.discovered_at,
    verifiedAt: row.verified_at,
  };
}

export function upsertDiscoveryResult(result: DiscoveryResult): DiscoveryResult {
  const db = getDbInstance();
  db.prepare(
    `INSERT INTO discovery_results
       (provider_id, method, endpoint, auth_type, models, rate_limit, feasibility, risk_level, status, notes)
     VALUES (@provider_id, @method, @endpoint, @auth_type, @models, @rate_limit, @feasibility, @risk_level, @status, @notes)
     ON CONFLICT(provider_id, method, endpoint) DO UPDATE SET
       auth_type = excluded.auth_type,
       models = excluded.models,
       rate_limit = excluded.rate_limit,
       feasibility = excluded.feasibility,
       risk_level = excluded.risk_level,
       status = excluded.status,
       notes = excluded.notes`,
  ).run({
    provider_id: result.providerId,
    method: result.method,
    endpoint: result.endpoint ?? null,
    auth_type: result.authType,
    models: result.models ? JSON.stringify(result.models) : null,
    rate_limit: result.rateLimit ?? null,
    feasibility: result.feasibility,
    risk_level: result.riskLevel,
    status: result.status,
    notes: result.notes ?? null,
  });
  const row = db
    .prepare(
      `SELECT * FROM discovery_results
       WHERE provider_id = ? AND method = ? AND ifnull(endpoint, '') = ifnull(?, '')`,
    )
    .get(result.providerId, result.method, result.endpoint ?? null) as DiscoveryRow | undefined;
  return rowToResult(row!);
}

export function getDiscoveryResults(providerId?: string): DiscoveryResult[] {
  const db = getDbInstance();
  const rows = providerId
    ? (db
        .prepare("SELECT * FROM discovery_results WHERE provider_id = ? ORDER BY discovered_at DESC, id DESC")
        .all(providerId) as DiscoveryRow[])
    : (db.prepare("SELECT * FROM discovery_results ORDER BY discovered_at DESC, id DESC").all() as DiscoveryRow[]);
  return rows.map(rowToResult);
}

export function getDiscoveryResultById(id: number): DiscoveryResult | null {
  const row = getDbInstance().prepare("SELECT * FROM discovery_results WHERE id = ?").get(id) as
    | DiscoveryRow
    | undefined;
  return row ? rowToResult(row) : null;
}

export function markDiscoveryResultVerified(id: number): DiscoveryResult | null {
  const info = getDbInstance()
    .prepare("UPDATE discovery_results SET status = 'verified', verified_at = datetime('now') WHERE id = ?")
    .run(id);
  return info.changes === 0 ? null : getDiscoveryResultById(id);
}

export function deleteDiscoveryResult(id: number): boolean {
  return getDbInstance().prepare("DELETE FROM discovery_results WHERE id = ?").run(id).changes > 0;
}
