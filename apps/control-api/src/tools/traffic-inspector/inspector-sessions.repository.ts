import { randomUUID } from "node:crypto";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";

export interface InspectorSessionRow {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  request_count: number;
  profile: "llm" | "custom" | "all" | null;
}

interface InspectorSessionDbRow {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  request_count: number;
  profile: string | null;
}

interface InspectorSessionRequestDbRow {
  session_id: string;
  seq: number;
  payload: string;
}

function mapSessionRow(row: InspectorSessionDbRow): InspectorSessionRow {
  return {
    id: row.id,
    name: row.name,
    started_at: row.started_at,
    ended_at: row.ended_at,
    request_count: row.request_count,
    profile: row.profile as InspectorSessionRow["profile"],
  };
}

/** Persistence boundary for the control-api Traffic Inspector recording UI. */
export class InspectorSessionsRepository {
  create(opts?: { name?: string; profile?: "llm" | "custom" | "all" }): { id: string; started_at: string } {
    const id = randomUUID();
    const started_at = new Date().toISOString();
    getDbInstance()
      .prepare("INSERT INTO inspector_sessions (id, name, started_at, profile) VALUES (?, ?, ?, ?)")
      .run(id, opts?.name ?? null, started_at, opts?.profile ?? null);
    return { id, started_at };
  }

  stop(id: string): void {
    getDbInstance().prepare("UPDATE inspector_sessions SET ended_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  }

  rename(id: string, name: string): void {
    getDbInstance().prepare("UPDATE inspector_sessions SET name = ? WHERE id = ?").run(name, id);
  }

  list(): InspectorSessionRow[] {
    const rows = getDbInstance()
      .prepare("SELECT * FROM inspector_sessions ORDER BY started_at DESC")
      .all() as InspectorSessionDbRow[];
    return rows.map(mapSessionRow);
  }

  get(id: string): InspectorSessionRow | null {
    const row = getDbInstance()
      .prepare("SELECT * FROM inspector_sessions WHERE id = ?")
      .get(id) as InspectorSessionDbRow | undefined;
    return row ? mapSessionRow(row) : null;
  }

  appendRequest(sessionId: string, payload: string): number {
    const db = getDbInstance();
    let insertedSeq = 0;
    db.transaction(() => {
      const seqRow = db
        .prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM inspector_session_requests WHERE session_id = ?")
        .get(sessionId) as { next_seq: number };
      insertedSeq = seqRow.next_seq;
      db.prepare("INSERT INTO inspector_session_requests (session_id, seq, payload) VALUES (?, ?, ?)")
        .run(sessionId, insertedSeq, payload);
      db.prepare("UPDATE inspector_sessions SET request_count = request_count + 1 WHERE id = ?")
        .run(sessionId);
    })();
    return insertedSeq;
  }

  getRequests(sessionId: string): Array<{ seq: number; payload: string }> {
    const rows = getDbInstance()
      .prepare("SELECT seq, payload FROM inspector_session_requests WHERE session_id = ? ORDER BY seq ASC")
      .all(sessionId) as InspectorSessionRequestDbRow[];
    return rows.map(({ seq, payload }) => ({ seq, payload }));
  }

  delete(id: string): void {
    getDbInstance().prepare("DELETE FROM inspector_sessions WHERE id = ?").run(id);
  }
}

export const inspectorSessionsRepository = new InspectorSessionsRepository();
