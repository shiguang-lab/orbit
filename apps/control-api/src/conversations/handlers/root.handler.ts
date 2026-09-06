import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  listMultiTurnConversations,
} from "@shiguang-gateway/core-domain/db/agentic-conversations";
import { getPendingById } from "@shiguang-gateway/core-domain/edge/usage-db";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const { rows, total } = listMultiTurnConversations({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    const activeCallLogIdByConversation = new Map<string, string>();
    for (const pending of getPendingById().values()) {
      if (pending.sessionTag) activeCallLogIdByConversation.set(pending.sessionTag, pending.id);
    }
    const conversations = rows.map((row) => ({
      ...row,
      isActive: activeCallLogIdByConversation.has(row.id),
      activeCallLogId: activeCallLogIdByConversation.get(row.id) ?? null,
    }));
    return Response.json({ conversations, total });
  } catch (err) {
    console.error("[API ERROR] /api/conversations failed:", err);
    return Response.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
