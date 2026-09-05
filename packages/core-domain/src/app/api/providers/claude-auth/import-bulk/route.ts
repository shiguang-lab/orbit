import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";
import { ClaudeAuthFileError } from "../../../../../lib/oauth/utils/claudeAuthFile.ts";
import {
  parseAndValidateClaudeAuth,
  enrichWithBootstrap,
  createConnectionFromAuthFile,
} from "../../../../../lib/oauth/utils/claudeAuthImport.ts";
import { getAuditRequestContext, logAuditEvent } from "../../../../../lib/compliance/index.ts";
import { getProviderAuditTarget } from "../../../../../lib/compliance/providerAudit.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";
import { importClaudeAuthBulkSchema } from "../../../../../shared/validation/schemas.ts";
import { validateBody, isValidationFailure } from "../../../../../shared/validation/helpers.ts";
import { sanitizeProviderSpecificDataForResponse } from "../../../../../lib/providers/requestDefaults.ts";

function sanitizeConnectionForResponse(connection: Record<string, unknown>) {
  const safe = { ...connection };
  delete safe.accessToken;
  delete safe.refreshToken;
  delete safe.idToken;
  delete safe.apiKey;
  if (safe.providerSpecificData) {
    safe.providerSpecificData = sanitizeProviderSpecificDataForResponse(safe.providerSpecificData);
  }
  return safe;
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const auditContext = getAuditRequestContext(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = validateBody(importClaudeAuthBulkSchema, body);
  if (isValidationFailure(parsedBody)) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const { entries, overwriteExisting } = parsedBody.data;

  const created: Record<string, unknown>[] = [];
  const errors: { index: number; name: string; message: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const label = e.name || `entry ${i + 1}`;
    try {
      const parsedAuth = parseAndValidateClaudeAuth(e.json);
      const enriched = await enrichWithBootstrap(parsedAuth);
      const { connection } = await createConnectionFromAuthFile(enriched, {
        name: e.name,
        email: e.email,
        overwriteExisting,
      });

      const safe = sanitizeConnectionForResponse(connection as Record<string, unknown>);
      created.push(safe);

      logAuditEvent({
        action: "provider.credentials.imported",
        actor: "admin",
        target: getProviderAuditTarget(connection),
        resourceType: "provider_credentials",
        status: "success",
        ipAddress: auditContext.ipAddress || undefined,
        requestId: auditContext.requestId,
        metadata: {
          provider: "claude",
          email: enriched.email || e.email,
          bulkIndex: i,
        },
      });
    } catch (err) {
      let message: string;
      if (err instanceof ClaudeAuthFileError) {
        message = err.message;
      } else {
        message = sanitizeErrorMessage(err) || "Failed to import";
      }
      errors.push({ index: i, name: label, message });
    }
  }

  logAuditEvent({
    action: "provider.credentials.bulk_imported",
    actor: "admin",
    target: "claude",
    resourceType: "provider_credentials",
    status: errors.length === entries.length ? "failure" : "success",
    ipAddress: auditContext.ipAddress || undefined,
    requestId: auditContext.requestId,
    metadata: {
      provider: "claude",
      total: entries.length,
      success: created.length,
      failed: errors.length,
    },
  });

  return NextResponse.json({
    success: created.length,
    failed: errors.length,
    total: entries.length,
    created,
    errors,
  });
}
