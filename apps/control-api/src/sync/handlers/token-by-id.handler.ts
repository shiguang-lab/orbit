import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/compliance/audit-log";
import { createErrorResponse, createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { revokeSyncTokenById } from "@shiguang-gateway/core-domain/control/sync-tokens";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const auditContext = getAuditRequestContext(request);
  try {
    const revoked = await revokeSyncTokenById(params.id);
    if (!revoked) return createErrorResponse({ status: 404, message: "Sync token not found" });
    logAuditEvent({
      action: "sync.token.revoked", actor: "admin", target: revoked.name, resourceType: "sync_token", status: "success",
      ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId,
      metadata: { id: revoked.id, name: revoked.name, syncApiKeyId: revoked.syncApiKeyId, revokedAt: revoked.revokedAt },
    });
    return Response.json({ message: "Sync token revoked successfully", syncToken: revoked });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to revoke sync token");
  }
}
