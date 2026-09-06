import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  getConversationTurnPage,
} from "@shiguang-gateway/core-domain/db/agentic-conversations";
import { resolveTurnDisplayContent } from "@shiguang-gateway/open-sse/services/conversationTurnContent";

export function parseSeqParam(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const id = context.params.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const limitParam = parseSeqParam(searchParams.get("limit"));
    const { nodes, hasMore } = getConversationTurnPage(id, {
      limit: limitParam != null && limitParam > 0 ? limitParam : undefined,
      beforeSeq: parseSeqParam(searchParams.get("beforeSeq")),
      afterSeq: parseSeqParam(searchParams.get("afterSeq")),
    });
    const displayContent = resolveTurnDisplayContent(nodes);
    return Response.json({
      nodes: nodes.map((n) => {
        const content = displayContent.get(n.contentHash);
        return {
          seq: n.seq,
          id: n.id,
          parentId: n.parentId,
          role: n.role,
          textPreview: content?.textPreview ?? "",
          blockKind: content?.blockKind ?? "text",
          toolName: content?.toolName ?? null,
          firstSeenAt: n.firstSeenAt,
        };
      }),
      hasMore,
    });
  } catch (err) {
    console.error("[API ERROR] /api/conversations/[id]/tree failed:", err);
    return Response.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}
