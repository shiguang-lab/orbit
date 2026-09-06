import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { ensureCliConfigWriteAllowed } from "@shiguang-gateway/core-domain/shared/services/cliRuntime";
import {
  CodexAuthFileError,
  buildCodexAuthFile,
  writeCodexAuthFileToLocalCliIfNeeded,
} from "@shiguang-gateway/open-sse/oauth/provider-auth-files/codex";
import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/compliance/audit-log";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof CodexAuthFileError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  return Response.json({ error: sanitizeErrorMessage(error) || fallback }, { status: 500 });
}

export async function applyLocal(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const auditContext = getAuditRequestContext(request);
  try {
    const writeGuard = ensureCliConfigWriteAllowed();
    if (writeGuard) return Response.json({ error: writeGuard, code: "writes_disabled" }, { status: 403 });
    let force = false;
    try { const body = await request.json(); force = body?.force === true; } catch { /* empty body is valid */ }
    const applied = await writeCodexAuthFileToLocalCliIfNeeded(id, { force });
    logAuditEvent({ action: "provider.credentials.applied", actor: "admin", target: id, resourceType: "provider_credentials", status: "success", ipAddress: auditContext.ipAddress || undefined, requestId: auditContext.requestId, metadata: { provider: "codex", decision: applied.decision, authPath: applied.authPath, savedBakPath: applied.result?.savedBakPath } });
    return Response.json({ success: true, connectionId: id, decision: applied.decision, connectionLabel: applied.result?.connectionLabel, authPath: applied.authPath, savedBakPath: applied.result?.savedBakPath, centralizedBackupPath: applied.result?.centralizedBackupPath, writtenAt: new Date().toISOString() });
  } catch (error) { return errorResponse(error, "Failed to apply Codex auth file"); }
}

export async function exportFile(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const built = await buildCodexAuthFile(id);
    return new Response(built.content, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${built.fileName}"`, "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error, "Failed to export Codex auth file"); }
}
