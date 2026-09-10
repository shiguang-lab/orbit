import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core";

export interface LogExportDestinationRow {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  batchSize: number;
  includeBodies: boolean;
  maxBodyBytes: number;
  maxRowsPerRun: number;
  cursorRowId: number;
  exportedTotal: number;
  lastRunAt: string | null;
  lastStatus: "success" | "failure" | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogExportDestinationInput {
  name: string;
  type: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  batchSize?: number;
  includeBodies?: boolean;
  maxBodyBytes?: number;
  maxRowsPerRun?: number;
}

export type UpdateLogExportDestinationInput = Partial<
  Omit<CreateLogExportDestinationInput, "type">
>;

function config(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mapRow(raw: unknown): LogExportDestinationRow {
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id), name: String(row.name), type: String(row.type), enabled: row.enabled === 1,
    config: config(row.config), batchSize: Number(row.batch_size), includeBodies: row.include_bodies === 1,
    maxBodyBytes: Number(row.max_body_bytes ?? 262_144), maxRowsPerRun: Number(row.max_rows_per_run),
    cursorRowId: Number(row.cursor_row_id ?? 0), exportedTotal: Number(row.exported_total ?? 0),
    lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
    lastStatus: row.last_status === "success" || row.last_status === "failure" ? row.last_status : null,
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function getLogExportDestinations(): LogExportDestinationRow[] {
  return getDbInstance().prepare("SELECT * FROM log_export_destinations ORDER BY created_at").all().map(mapRow);
}
export function getEnabledLogExportDestinations(): LogExportDestinationRow[] {
  return getDbInstance().prepare("SELECT * FROM log_export_destinations WHERE enabled = 1 ORDER BY created_at").all().map(mapRow);
}
export function getLogExportDestination(id: string): LogExportDestinationRow | null {
  const row = getDbInstance().prepare("SELECT * FROM log_export_destinations WHERE id = ?").get(id);
  return row ? mapRow(row) : null;
}
export function createLogExportDestination(input: CreateLogExportDestinationInput): LogExportDestinationRow {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDbInstance().prepare(`INSERT INTO log_export_destinations
    (id,name,type,enabled,config,batch_size,include_bodies,max_body_bytes,max_rows_per_run,cursor_row_id,exported_total,created_at,updated_at)
    VALUES (@id,@name,@type,@enabled,@config,@batchSize,@includeBodies,@maxBodyBytes,@maxRowsPerRun,0,0,@now,@now)`).run({
      id, name: input.name, type: input.type, enabled: input.enabled ? 1 : 0,
      config: JSON.stringify(input.config), batchSize: input.batchSize ?? 500,
      includeBodies: input.includeBodies ? 1 : 0, maxBodyBytes: input.maxBodyBytes ?? 262_144,
      maxRowsPerRun: input.maxRowsPerRun ?? 10_000, now,
    });
  return getLogExportDestination(id)!;
}
export function updateLogExportDestination(id: string, input: UpdateLogExportDestinationInput): LogExportDestinationRow | null {
  const current = getLogExportDestination(id);
  if (!current) return null;
  getDbInstance().prepare(`UPDATE log_export_destinations SET name=@name,enabled=@enabled,config=@config,
    batch_size=@batchSize,include_bodies=@includeBodies,max_body_bytes=@maxBodyBytes,
    max_rows_per_run=@maxRowsPerRun,updated_at=@now WHERE id=@id`).run({
      id, name: input.name ?? current.name, enabled: (input.enabled ?? current.enabled) ? 1 : 0,
      config: JSON.stringify(input.config ?? current.config), batchSize: input.batchSize ?? current.batchSize,
      includeBodies: (input.includeBodies ?? current.includeBodies) ? 1 : 0,
      maxBodyBytes: input.maxBodyBytes ?? current.maxBodyBytes,
      maxRowsPerRun: input.maxRowsPerRun ?? current.maxRowsPerRun, now: new Date().toISOString(),
    });
  return getLogExportDestination(id);
}
export function deleteLogExportDestination(id: string): boolean {
  return getDbInstance().prepare("DELETE FROM log_export_destinations WHERE id = ?").run(id).changes > 0;
}
export function advanceLogExportCursor(id: string, cursorRowId: number, exported: number): void {
  getDbInstance().prepare(`UPDATE log_export_destinations SET cursor_row_id=?, exported_total=exported_total+?, updated_at=? WHERE id=?`)
    .run(cursorRowId, exported, new Date().toISOString(), id);
}
export function resetLogExportCursor(id: string, cursorRowId = 0): void {
  getDbInstance().prepare("UPDATE log_export_destinations SET cursor_row_id=?, updated_at=? WHERE id=?").run(cursorRowId, new Date().toISOString(), id);
}
export function recordLogExportRun(id: string, status: "success" | "failure", error: string | null): void {
  const now = new Date().toISOString();
  getDbInstance().prepare(`UPDATE log_export_destinations SET last_run_at=?,last_status=?,last_error=?,updated_at=? WHERE id=?`)
    .run(now, status, error, now, id);
}
