import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import {
  getTopN,
  getRank,
  getNeighbors,
  type LeaderboardScope,
} from "@orbit/core/control/gamification";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getApiKeyDisplayNames } from "@orbit/core/db/api-keys";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") || "global") as LeaderboardScope;
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  const apiKeyId = url.searchParams.get("apiKeyId");

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return Response.json(
      { error: "'limit' must be an integer between 1 and 200" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const rawEntries = await getTopN(scope, limit);
  const names = getApiKeyDisplayNames(rawEntries.map((entry) => entry.apiKeyId));
  const entries = rawEntries.map((entry) => ({ ...entry, name: names.get(entry.apiKeyId) ?? null }));
  let myRank: number | null = null;
  let neighbors = null;

  if (apiKeyId) {
    myRank = await getRank(apiKeyId, scope);
    neighbors = await getNeighbors(apiKeyId, scope);
  }

  return Response.json({ entries, myRank, neighbors }, { headers: CORS_HEADERS });
}
