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
import { sanitizeErrorMessage } from "../../../../../../../open-sse/utils/error.ts";
import { importClaudeAuthSchema } from "../../../../../shared/validation/schemas.ts";
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

  const parsedBody = validateBody(importClaudeAuthSchema, body);
  if (isValidationFailure(parsedBody)) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const { source, name, email, overwriteExisting } = parsedBody.data;

  let rawJson: unknown;
  try {
    rawJson = source.kind === "json" ? source.json : JSON.parse(source.text);
  } catch {
    return NextResponse.json(
      { error: "Could not parse the content as JSON", code: "invalid_json" },
      { status: 400 }
    );
  }

  try {
    const parsed = parseAndValidateClaudeAuth(rawJson);
    const enriched = await enrichWithBootstrap(parsed);
    const { connection, created } = await createConnectionFromAuthFile(enriched, {
      name,
      email,
      overwriteExisting,
    });

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
        created,
        email: enriched.email || email,
        hasAccountUUID: !!enriched.accountUUID,
      },
    });

    return NextResponse.json({
      connection: sanitizeConnectionForResponse(connection as Record<string, unknown>),
      created,
    });
  } catch (error) {
    if (error instanceof ClaudeAuthFileError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) || "Failed to import Claude auth" },
      { status: 500 }
    );
  }
}
