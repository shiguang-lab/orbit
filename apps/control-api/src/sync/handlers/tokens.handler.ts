import { getAuditRequestContext, logAuditEvent } from "@orbit/core/compliance/audit-log";
import { createErrorResponse, createErrorResponseFromUnknown } from "@orbit/utils/errors/api-response";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createSyncTokenSchema } from "@orbit/core/validation/keys";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { issueSyncToken, listSyncTokenSummaries, resolveSyncApiKeyIdFromManagementRequest } from "@orbit/core/control/sync-tokens";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const tokens = await listSyncTokenSummaries();
    return Response.json({ tokens, total: tokens.length });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to list sync tokens");
  }
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const auditContext = getAuditRequestContext(request);
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }

  try {
    const validation = validateBody(createSyncTokenSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const issued = await issueSyncToken({
      name: validation.data.name,
      syncApiKeyId: await resolveSyncApiKeyIdFromManagementRequest(request),
    });
    const tokenSummary = {
      id: issued.record.id, name: issued.record.name, syncApiKeyId: issued.record.syncApiKeyId,
      revokedAt: issued.record.revokedAt, lastUsedAt: issued.record.lastUsedAt,
      createdAt: issued.record.createdAt, updatedAt: issued.record.updatedAt,
    };
    logAuditEvent({ action: "sync.token.created", actor: "admin", target: issued.record.name, resourceType: "sync_token", status: "success", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: tokenSummary });
    return Response.json({ token: issued.token, syncToken: tokenSummary }, { status: 201 });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to create sync token");
  }
}
