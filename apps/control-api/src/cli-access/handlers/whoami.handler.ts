import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { extractBearer, ACCESS_TOKEN_PREFIX } from "@shiguang-gateway/core-domain/control/access-token-auth";
import { verifyAccessToken, getAccessToken } from "@shiguang-gateway/core-domain/control/cli-access-tokens";

/**
 * GET /api/cli/whoami — report the current credential to the CLI.
 *
 * Requires a valid management credential (read scope is enough — it's a GET).
 * When the caller used a scoped CLI access token, returns its name/scope/expiry
 * so `shiguangGateway connect --key` / `context current` can confirm what they hold.
 * Other credentials (dashboard session, manage-scope API key, loopback CLI
 * token) report `viaAccessToken: false`.
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const bearer = extractBearer(request);
  if (bearer && bearer.startsWith(ACCESS_TOKEN_PREFIX)) {
    const verified = verifyAccessToken(bearer);
    if (verified) {
      const record = getAccessToken(verified.id);
      return Response.json({
        authenticated: true,
        viaAccessToken: true,
        id: verified.id,
        name: verified.name,
        scope: verified.scope,
        createdAt: record?.createdAt ?? null,
        lastUsedAt: record?.lastUsedAt ?? null,
        expiresAt: record?.expiresAt ?? null,
      });
    }
  }

  return Response.json({ authenticated: true, viaAccessToken: false, scope: null });
}
