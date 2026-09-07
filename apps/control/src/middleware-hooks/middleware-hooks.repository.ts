import { Injectable } from "@nestjs/common";
import { getDbInstance } from "@orbit/core/db/connection";
export type MiddlewareHookScope =
  | { type: "global" }
  | { type: "combo"; comboId: string };

export interface MiddlewareHookConfig {
  name: string;
  description: string;
  priority: number;
  scope: MiddlewareHookScope;
  enabled: boolean;
  code: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  lastError?: string;
}

export interface MiddlewareHookLogEntry {
  id: string;
  hookName: string;
  requestId: string;
  durationMs: number;
  mutated: boolean;
  skipped: boolean;
  error?: string;
  timestamp: string;
}

interface HookRow {
  name: string;
  description: string;
  priority: number;
  scope_type: "global" | "combo";
  combo_id?: string | null;
  enabled: number;
  code: string;
  created_at: string;
  updated_at: string;
  run_count: number;
  last_error?: string | null;
}

function fromRow(row: HookRow): MiddlewareHookConfig {
  return {
    name: row.name,
    description: row.description,
    priority: row.priority,
    scope: row.scope_type === "combo" && row.combo_id
      ? { type: "combo", comboId: row.combo_id }
      : { type: "global" },
    enabled: row.enabled === 1,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runCount: row.run_count,
    lastError: row.last_error || undefined,
  };
}

@Injectable()
export class MiddlewareHooksRepository {
  list(): MiddlewareHookConfig[] {
    const rows = getDbInstance()
      .prepare("SELECT * FROM middleware_hooks ORDER BY priority ASC, name ASC")
      .all() as HookRow[];
    return rows.map(fromRow);
  }

  find(name: string): MiddlewareHookConfig | undefined {
    const row = getDbInstance()
      .prepare("SELECT * FROM middleware_hooks WHERE name = ?")
      .get(name) as HookRow | undefined;
    return row ? fromRow(row) : undefined;
  }

  logs(hookName: string, limit: number): MiddlewareHookLogEntry[] {
    const rows = getDbInstance()
      .prepare("SELECT * FROM middleware_logs WHERE hook_name = ? ORDER BY timestamp DESC LIMIT ?")
      .all(hookName, limit) as Array<{
        id: string;
        hook_name: string;
        request_id: string;
        duration_ms: number;
        mutated: number;
        skipped: number;
        error?: string | null;
        timestamp: string;
      }>;
    return rows.map((row) => ({
      id: row.id,
      hookName: row.hook_name,
      requestId: row.request_id,
      durationMs: row.duration_ms,
      mutated: row.mutated === 1,
      skipped: row.skipped === 1,
      error: row.error || undefined,
      timestamp: row.timestamp,
    }));
  }

  create(config: MiddlewareHookConfig): MiddlewareHookConfig {
    const now = new Date().toISOString();
    getDbInstance().prepare(`
      INSERT INTO middleware_hooks
        (name, description, priority, scope_type, combo_id, enabled, code, created_at, updated_at, run_count, last_error)
      VALUES (@name, @description, @priority, @scope_type, @combo_id, @enabled, @code, @created_at, @updated_at, @run_count, @last_error)
    `).run({
      name: config.name,
      description: config.description,
      priority: config.priority,
      scope_type: config.scope.type,
      combo_id: config.scope.type === "combo" ? config.scope.comboId : null,
      enabled: config.enabled ? 1 : 0,
      code: config.code,
      created_at: now,
      updated_at: now,
      run_count: config.runCount || 0,
      last_error: config.lastError ?? null,
    });
    return this.find(config.name)!;
  }

  update(name: string, updates: Partial<MiddlewareHookConfig>): MiddlewareHookConfig | undefined {
    const existing = this.find(name);
    if (!existing) return undefined;
    const next = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    getDbInstance().prepare(`
      UPDATE middleware_hooks SET
        description = @description, priority = @priority, scope_type = @scope_type,
        combo_id = @combo_id, enabled = @enabled, code = @code,
        updated_at = @updated_at, run_count = @run_count, last_error = @last_error
      WHERE name = @name
    `).run({
      name,
      description: next.description,
      priority: next.priority,
      scope_type: next.scope.type,
      combo_id: next.scope.type === "combo" ? next.scope.comboId : null,
      enabled: next.enabled ? 1 : 0,
      code: next.code,
      updated_at: next.updatedAt,
      run_count: next.runCount || 0,
      last_error: next.lastError ?? null,
    });
    return this.find(name);
  }

  remove(name: string): boolean {
    return getDbInstance().prepare("DELETE FROM middleware_hooks WHERE name = ?").run(name).changes > 0;
  }
}
