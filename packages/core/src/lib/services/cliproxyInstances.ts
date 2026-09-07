import { getDbInstance } from "../db/core.ts";
import { sanitizeCliproxyAuthFiles } from "./cliproxyAccountHealth.ts";

export type CliproxyInstanceType = "local_managed" | "remote_agent";
export type CliproxyInstanceStatus = "healthy" | "unhealthy" | "stopped" | "unknown";

export interface CliproxyInstanceRecord {
  id: string;
  name: string;
  endpoint: string;
  managementKey: string | null;
  type: CliproxyInstanceType;
  enabled: boolean;
  weight: number;
  tags: string[];
  modelMappings: Record<string, string>;
  status: CliproxyInstanceStatus;
  lastHealthCheck: string | null;
  latencyMs: number | null;
  version: string | null;
  accountsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CliproxyInstanceRow {
  id: string;
  name: string;
  endpoint: string;
  management_key: string | null;
  type: string;
  enabled: number;
  weight: number;
  tags: string;
  model_mappings: string;
  status: string;
  last_health_check: string | null;
  latency_ms: number | null;
  version: string | null;
  accounts_count: number;
  created_at: string;
  updated_at: string;
}

function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function rowToRecord(row: CliproxyInstanceRow): CliproxyInstanceRecord {
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    managementKey: row.management_key,
    type: (row.type as CliproxyInstanceType) || "remote_agent",
    enabled: row.enabled === 1,
    weight: typeof row.weight === "number" ? row.weight : 100,
    tags: parseJsonSafe<string[]>(row.tags, []),
    modelMappings: parseJsonSafe<Record<string, string>>(row.model_mappings, {}),
    status: (row.status as CliproxyInstanceStatus) || "unknown",
    lastHealthCheck: row.last_health_check,
    latencyMs: row.latency_ms,
    version: row.version,
    accountsCount: typeof row.accounts_count === "number" ? row.accounts_count : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCliproxyInstances(): CliproxyInstanceRecord[] {
  const db = getDbInstance();
  const rows = db
    .prepare("SELECT * FROM cliproxy_instances ORDER BY CASE WHEN type = 'local_managed' THEN 0 ELSE 1 END, created_at ASC")
    .all() as CliproxyInstanceRow[];
  return rows.map(rowToRecord);
}

export function getCliproxyInstance(id: string): CliproxyInstanceRecord | null {
  const db = getDbInstance();
  const row = db.prepare("SELECT * FROM cliproxy_instances WHERE id = ?").get(id) as CliproxyInstanceRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createCliproxyInstance(data: {
  id?: string;
  name: string;
  endpoint: string;
  managementKey?: string | null;
  type?: CliproxyInstanceType;
  enabled?: boolean;
  weight?: number;
  tags?: string[];
  modelMappings?: Record<string, string>;
}): CliproxyInstanceRecord {
  const db = getDbInstance();
  const id = data.id || `cpa-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO cliproxy_instances (
      id, name, endpoint, management_key, type, enabled, weight, tags, model_mappings, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', ?, ?)`
  ).run(
    id,
    data.name,
    data.endpoint.replace(/\/+$/, ""),
    data.managementKey ?? null,
    data.type || "remote_agent",
    data.enabled === false ? 0 : 1,
    data.weight ?? 100,
    JSON.stringify(data.tags || []),
    JSON.stringify(data.modelMappings || {}),
    now,
    now
  );

  return getCliproxyInstance(id)!;
}

export function updateCliproxyInstance(
  id: string,
  data: Partial<{
    name: string;
    endpoint: string;
    managementKey: string | null;
    type: CliproxyInstanceType;
    enabled: boolean;
    weight: number;
    tags: string[];
    modelMappings: Record<string, string>;
    status: CliproxyInstanceStatus;
    lastHealthCheck: string | null;
    latencyMs: number | null;
    version: string | null;
    accountsCount: number;
  }>
): CliproxyInstanceRecord | null {
  const db = getDbInstance();
  const existing = getCliproxyInstance(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
  if (data.endpoint !== undefined) { updates.push("endpoint = ?"); params.push(data.endpoint.replace(/\/+$/, "")); }
  if (data.managementKey !== undefined) { updates.push("management_key = ?"); params.push(data.managementKey); }
  if (data.type !== undefined) { updates.push("type = ?"); params.push(data.type); }
  if (data.enabled !== undefined) { updates.push("enabled = ?"); params.push(data.enabled ? 1 : 0); }
  if (data.weight !== undefined) { updates.push("weight = ?"); params.push(data.weight); }
  if (data.tags !== undefined) { updates.push("tags = ?"); params.push(JSON.stringify(data.tags)); }
  if (data.modelMappings !== undefined) { updates.push("model_mappings = ?"); params.push(JSON.stringify(data.modelMappings)); }
  if (data.status !== undefined) { updates.push("status = ?"); params.push(data.status); }
  if (data.lastHealthCheck !== undefined) { updates.push("last_health_check = ?"); params.push(data.lastHealthCheck); }
  if (data.latencyMs !== undefined) { updates.push("latency_ms = ?"); params.push(data.latencyMs); }
  if (data.version !== undefined) { updates.push("version = ?"); params.push(data.version); }
  if (data.accountsCount !== undefined) { updates.push("accounts_count = ?"); params.push(data.accountsCount); }

  if (updates.length === 0) return existing;

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE cliproxy_instances SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  return getCliproxyInstance(id);
}

export function deleteCliproxyInstance(id: string): boolean {
  const db = getDbInstance();
  const instance = getCliproxyInstance(id);
  if (!instance) return false;
  if (instance.type === "local_managed") {
    throw new Error("Cannot delete local managed CLIProxy instance. You can disable it instead.");
  }
  const res = db.prepare("DELETE FROM cliproxy_instances WHERE id = ?").run(id);
  return res.changes > 0;
}

export async function probeCliproxyInstance(
  instance: CliproxyInstanceRecord,
  timeoutMs = 5000
): Promise<{
  status: CliproxyInstanceStatus;
  latencyMs?: number;
  version?: string | null;
  accountsCount?: number;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const base = instance.endpoint.replace(/\/+$/, "");

  try {
    const headers: Record<string, string> = {};
    if (instance.managementKey) {
      headers.Authorization = `Bearer ${instance.managementKey}`;
    }

    // Attempt to query management auth files
    const authUrl = `${base}/v0/management/auth-files`;
    const res = await fetch(authUrl, { headers, signal: controller.signal });
    const latencyMs = Date.now() - start;
    const version = res.headers.get("x-cpa-version") || instance.version;

    if (res.ok) {
      const payload = await res.json().catch(() => null);
      const accounts = sanitizeCliproxyAuthFiles(payload);
      const accountsCount = accounts ? accounts.filter((a) => !a.disabled).length : 0;
      const result = { status: "healthy" as const, latencyMs, version, accountsCount };
      updateCliproxyInstance(instance.id, {
        status: "healthy",
        latencyMs,
        version,
        accountsCount,
        lastHealthCheck: new Date().toISOString(),
      });
      return result;
    }

    // Fallback to /healthz probe
    const healthRes = await fetch(`${base}/healthz`, { signal: controller.signal });
    if (healthRes.ok) {
      const result = { status: "healthy" as const, latencyMs, version };
      updateCliproxyInstance(instance.id, {
        status: "healthy",
        latencyMs,
        version,
        lastHealthCheck: new Date().toISOString(),
      });
      return result;
    }

    const result = { status: "unhealthy" as const, latencyMs, error: `HTTP ${res.status}` };
    updateCliproxyInstance(instance.id, {
      status: "unhealthy",
      latencyMs,
      lastHealthCheck: new Date().toISOString(),
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateCliproxyInstance(instance.id, {
      status: "unhealthy",
      lastHealthCheck: new Date().toISOString(),
    });
    return { status: "unhealthy", error };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Select the optimal CLIProxyAPI target instance for inference routing.
 * Prioritizes:
 * 1. Matching preferredInstanceId if provided and enabled
 * 2. Filter by tag if requested
 * 3. Filter by healthy status (falls back to any enabled if none healthy)
 * 4. Weighted selection / lowest latency
 */
export function getTargetCliproxyInstance(options?: {
  preferredInstanceId?: string;
  tag?: string;
}): CliproxyInstanceRecord | null {
  const instances = listCliproxyInstances().filter((i) => i.enabled);
  if (instances.length === 0) return null;

  if (options?.preferredInstanceId) {
    const found = instances.find((i) => i.id === options.preferredInstanceId);
    if (found) return found;
  }

  let candidates = instances;
  if (options?.tag) {
    const tagged = instances.filter((i) => i.tags.includes(options.tag!));
    if (tagged.length > 0) candidates = tagged;
  }

  const healthy = candidates.filter((i) => i.status === "healthy");
  const pool = healthy.length > 0 ? healthy : candidates;

  // Weighted random selection
  const totalWeight = pool.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let threshold = Math.random() * totalWeight;
  for (const item of pool) {
    threshold -= Math.max(1, item.weight);
    if (threshold <= 0) return item;
  }

  return pool[0];
}
