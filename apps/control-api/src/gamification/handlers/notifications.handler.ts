import { CORS_HEADERS } from "@shiguang-gateway/core-domain/shared/cors";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { createBadgeNotificationStream } from "@shiguang-gateway/core-domain/control/gamification";

/**
 * GET /api/gamification/notifications?apiKeyId=xxx — SSE badge unlock notifications
 */
export async function GET(request: Request) {
  const authErr = await requireManagementAuth(request);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const apiKeyId = url.searchParams.get("apiKeyId");

  if (!apiKeyId) {
    return new Response(JSON.stringify({ error: "apiKeyId required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const stream = createBadgeNotificationStream(apiKeyId, request.signal);

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
