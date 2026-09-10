/**
 * GET /api/gamification/level — current XP/level for a key, or the operator-wide
 * aggregate when no `apiKeyId` is supplied (the dashboard profile page case). (#3484)
 *
 * LOCAL_ONLY: not process-spawning; management-scoped via requireManagementAuth.
 */
import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import { getXp, getStreak, getAggregateStreak } from "@orbit/core/gamification/profile";
import { getAggregateXp } from "../domain/profile.js";
import { requireManagementAuth } from "@orbit/core/control/management-auth";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const apiKeyId = new URL(request.url).searchParams.get("apiKeyId");
  const level = apiKeyId ? getXp(apiKeyId) : getAggregateXp();
  const streakData = apiKeyId ? await getStreak(apiKeyId) : await getAggregateStreak();
  return Response.json({
    level,
    streak: { current: streakData.currentStreak, longest: streakData.longestStreak },
  }, { headers: CORS_HEADERS });
}
