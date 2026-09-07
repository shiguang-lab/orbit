/**
 * GET /api/gamification/badges/earned — badges earned by a key, or the operator-wide
 * earned set (distinct across all keys) when no `apiKeyId` is supplied. (#3484)
 *
 * LOCAL_ONLY: not process-spawning; management-scoped via requireManagementAuth.
 */
import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import { getBadges } from "@orbit/core/gamification/profile";
import { getAllEarnedBadges } from "../domain/profile.js";
import { requireManagementAuth } from "@orbit/core/control/management-auth";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const apiKeyId = new URL(request.url).searchParams.get("apiKeyId");
  const badges = apiKeyId ? getBadges(apiKeyId) : getAllEarnedBadges();
  return Response.json({ badges }, { headers: CORS_HEADERS });
}
