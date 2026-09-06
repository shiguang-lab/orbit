/**
 * GET /api/gamification/badges — the full built-in badge catalog (definitions).
 * Seeds the built-in badges first (idempotent INSERT OR IGNORE) so the profile
 * grid is populated even on installs where seeding never ran. (#3484, see #3472)
 *
 * LOCAL_ONLY: not process-spawning; management-scoped via requireManagementAuth.
 */
import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { getBadgeDefinitions } from "@shiguang-gateway/core-domain/gamification/profile";
import { seedBuiltinBadges } from "@shiguang-gateway/core-domain/control/gamification";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  await seedBuiltinBadges();

  const category = new URL(request.url).searchParams.get("category") || undefined;
  const badges = getBadgeDefinitions(category);
  return Response.json({ badges }, { headers: CORS_HEADERS });
}
