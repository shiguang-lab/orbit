import {
  listA2ATaskEvents,
  listA2ATaskHistory,
  type TaskState,
} from "@orbit/core/a2a/runtime";
import { authorizeA2ATaskRoute } from "./auth.js";

const states = new Set<TaskState>(["submitted", "working", "completed", "failed", "cancelled"]);

function parseJson(value: string | null, fallback: unknown) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function GET(request: Request) {
  const auth = await authorizeA2ATaskRoute(request);
  if (auth instanceof Response) return auth;
  const query = new URL(request.url).searchParams;
  const state = query.get("state") ?? undefined;
  if (state && !states.has(state as TaskState)) {
    return Response.json({ error: "Invalid history state" }, { status: 400 });
  }
  const limit = Math.max(1, Math.min(500, Number.parseInt(query.get("limit") ?? "100", 10) || 100));
  const offset = Math.max(0, Number.parseInt(query.get("offset") ?? "0", 10) || 0);
  const { rows, total } = listA2ATaskHistory({
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    skill: query.get("skill") ?? undefined,
    state,
    owner: auth.owner,
    limit,
    offset,
  });
  const tasks = rows.map((row) => {
    const hitEvent = [...listA2ATaskEvents(row.id)].reverse().find((event) => event.event_type === "memory_hits");
    const memoryHits = parseJson(hitEvent?.data_json ?? null, []);
    return {
      id: row.id,
      state: row.state,
      skill: row.skill_id,
      input: parseJson(row.input_json, null),
      artifacts: parseJson(row.output_json, []),
      metadata: { memoryHits: Array.isArray(memoryHits) ? memoryHits : [] },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  });
  return Response.json({ tasks, total, limit, offset });
}
