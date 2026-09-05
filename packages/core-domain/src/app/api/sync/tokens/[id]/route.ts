import { NextResponse } from "next/server";
import { getAuditRequestContext, logAuditEvent } from "../../../../../lib/compliance/index.ts";
import { createErrorResponse, createErrorResponseFromUnknown } from "../../../../../lib/api/errorResponse.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";
import { getSyncTokenById } from "../../../../../lib/db/syncTokens.ts";
import { revokeSyncTokenById } from "../../../../../lib/sync/tokens.ts";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const auditContext = getAuditRequestContext(request);

  try {
    const { id } = await params;
    const existing = await getSyncTokenById(id);
    if (!existing) {
      return createErrorResponse({
        status: 404,
        message: "Sync token not found",
      });
    }

    const revoked = await revokeSyncTokenById(id);
    if (!revoked) {
      return createErrorResponse({
        status: 404,
        message: "Sync token not found",
      });
    }

    logAuditEvent({
      action: "sync.token.revoked",
      actor: "admin",
      target: revoked.name,
      resourceType: "sync_token",
      status: "success",
      ipAddress: auditContext.ipAddress || undefined,
      requestId: auditContext.requestId,
      metadata: {
        id: revoked.id,
        name: revoked.name,
        syncApiKeyId: revoked.syncApiKeyId,
        revokedAt: revoked.revokedAt,
      },
    });

    return NextResponse.json({
      message: "Sync token revoked successfully",
      syncToken: revoked,
    });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to revoke sync token");
  }
}
