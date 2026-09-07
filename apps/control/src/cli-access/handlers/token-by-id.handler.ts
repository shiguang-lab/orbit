import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { revokeAccessToken } from "@orbit/core/control/cli-access-tokens";

/**
 * DELETE /api/cli/tokens/:id — revoke an access token (by id or display prefix).
 * Admin-only (same enforcement as the collection route). Idempotent: revoking
 * an unknown/already-revoked token returns 404.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const { id } = params;
  const revoked = revokeAccessToken(id);
  if (!revoked) {
    return Response.json({ error: "Token not found or already revoked" }, { status: 404 });
  }
  return Response.json({ success: true, id });
}
