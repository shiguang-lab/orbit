import { getApiKeyMetadata, validateApiKey } from "@orbit/core/db/api-keys";
import { hasSelfUsageScope } from "@orbit/core/shared/constants/selfServiceScopes";
import { buildApiKeySelfServiceStatus } from "./api-key-self-service.js";

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

function authError(status = 401): Response {
  return Response.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
}

/** GET /v1/me/status — authenticated API-key self-service usage status. */
export async function GET(request: Request): Promise<Response> {
  const apiKey = extractBearerToken(request);
  if (!apiKey) return authError(401);

  const valid = await validateApiKey(apiKey);
  if (!valid) return authError(401);

  const metadata = await getApiKeyMetadata(apiKey);
  if (!metadata || metadata.id === "env-key") return authError(401);
  if (!hasSelfUsageScope(metadata.scopes)) return authError(403);

  try {
    const status = await buildApiKeySelfServiceStatus({
      id: metadata.id,
      name: metadata.name,
      scopes: metadata.scopes,
      allowedConnections: metadata.allowedConnections,
    });
    return Response.json(status);
  } catch (error) {
    if (error instanceof Error && error.message === "missing_self_usage_scope") {
      return authError(403);
    }
    return Response.json({ error: "Failed to build API key status" }, { status: 500 });
  }
}
