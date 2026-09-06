import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { rotateScope } from "@shiguang-gateway/core-domain/control/gamification";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { z } from "zod";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/gamification/rotate — Manually trigger leaderboard rotation
 */
export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const schema = z.object({
    scope: z.enum(["weekly", "monthly"]),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: CORS_HEADERS });
  }

  await rotateScope(parsed.data.scope);

  return Response.json({ success: true, scope: parsed.data.scope }, { headers: CORS_HEADERS });
}
