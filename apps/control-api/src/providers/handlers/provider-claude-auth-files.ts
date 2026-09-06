import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { ensureCliConfigWriteAllowed } from "@shiguang-gateway/core-domain/shared/services/cliRuntime";
import {
  ClaudeAuthFileError,
  buildClaudeAuthFile,
  writeClaudeAuthFileToLocalCli,
} from "@shiguang-gateway/open-sse/oauth/provider-auth-files/claude";
import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/control/compliance";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof ClaudeAuthFileError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  return Response.json({ error: sanitizeErrorMessage(error) || fallback }, { status: 500 });
}

export async function applyLocal(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const auditContext = getAuditRequestContext(request);
  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) return Response.json({ error: writeGuard, code: "writes_disabled" }, { status: 403 });
    const result = await writeClaudeAuthFileToLocalCli(id);
    logAuditEvent({ action: "provider.credentials.applied", actor: "admin", target: id, resourceType: "provider_credentials", status: "success", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { provider: "claude", ...result } });
    return Response.json({
      success: true,
      connectionId: id,
      connectionLabel: result.connectionLabel,
      authPath: result.authPath,
      savedBakPath: result.savedBakPath,
      centralizedBackupPath: result.centralizedBackupPath,
      mcpOAuthPreserved: result.mcpOAuthPreserved,
      writtenAt: new Date().toISOString(),
    });
  } catch (error) { return errorResponse(error, "Failed to apply Claude auth file"); }
}

export async function exportFile(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const built = await buildClaudeAuthFile(id);
    return new Response(built.content, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${built.fileName}"`, "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error, "Failed to export Claude auth file"); }
}
