import { getProviderConnectionById } from "@shiguang-gateway/core-domain/db/provider-connections";
import { refreshKimiProviderConnection } from "@shiguang-gateway/core-domain/control/kimi-token-refresh";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { parseKimiJwt } from "@shiguang-gateway/open-sse/utils/kimiJwt";

/** POST /api/providers/:id/refresh-token. */
export async function POST(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const connection = await getProviderConnectionById(id);
  if (!connection) return Response.json({ error: `Provider connection ${id} not found` }, { status: 404 });

  const provider = String(connection.provider || "").toLowerCase();
  if (provider !== "kimi-web" && provider !== "kimi_web") {
    return Response.json({ error: `Manual token refresh not supported for provider ${connection.provider}` }, { status: 400 });
  }
  const result = await refreshKimiProviderConnection(id);
  if (!result.success || !result.accessToken) {
    return Response.json({ error: result.error || "Failed to refresh Kimi token" }, { status: 400 });
  }
  const payload = parseKimiJwt(result.accessToken);
  return Response.json({
    success: true,
    message: "Token refreshed successfully",
    expiresAt: result.expiresAtSec ? new Date(result.expiresAtSec * 1000).toISOString() : null,
    user: { userId: payload?.sub || null, region: payload?.region || null, spaceId: payload?.space_id || null },
  });
}
