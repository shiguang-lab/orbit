import { Injectable } from "@nestjs/common";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";

/** Writable fields accepted by the control-plane skills update endpoint. */
export interface SkillPatch {
  enabled?: number | boolean;
  mode?: string;
}

/**
 * Persistence boundary for control-plane skill mutations.
 *
 * The registry remains a shared runtime capability because it is also used by
 * the edge/SSE execution path.  Updating a skill row, however, is an
 * administrative concern and belongs to the control app that owns this HTTP
 * surface.
 */
@Injectable()
export class SkillsRepository {
  private static readonly UPDATABLE_COLUMNS = new Set(["enabled", "mode", "updated_at"]);

  update(id: string, patch: SkillPatch): number {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(patch)) {
      if (!SkillsRepository.UPDATABLE_COLUMNS.has(key)) continue;
      setClauses.push(`${key} = ?`);
      params.push(value);
    }

    if (setClauses.length === 0) return 0;

    setClauses.push("updated_at = datetime('now')");
    params.push(id);
    const result = getDbInstance()
      .prepare(`UPDATE skills SET ${setClauses.join(", ")} WHERE id = ?`)
      .run(...params);
    return (result as { changes: number }).changes;
  }
}
