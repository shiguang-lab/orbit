import { assignProxyToScope, getProxyAssignments, resolveProxyForConnection } from "../../../../../lib/localDb.ts";
import { proxyAssignmentSchema } from "../../../../../shared/validation/schemas.ts";
import { isValidationFailure, validateBody } from "../../../../../shared/validation/helpers.ts";
import { createErrorResponse, createErrorResponseFromUnknown } from "../../../../../lib/api/errorResponse.ts";
import { clearDispatcherCache } from "../../../../../../open-sse/utils/proxyDispatcher.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const proxyId = searchParams.get("proxyId");
    const scope = searchParams.get("scope");
    const scopeId = searchParams.get("scopeId");
    const resolveConnectionId = searchParams.get("resolveConnectionId");

    if (resolveConnectionId) {
      const resolved = await resolveProxyForConnection(resolveConnectionId);
      return Response.json(resolved);
    }

    const assignments = await getProxyAssignments({
      proxyId: proxyId || undefined,
      scope: scope || undefined,
    });
    const filtered = scopeId
      ? assignments.filter((entry) => entry.scopeId === scopeId)
      : assignments;
    return Response.json({ items: filtered, total: filtered.length });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to load proxy assignments");
  }
}

export async function PUT(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return createErrorResponse({
      status: 400,
      message: "Invalid JSON body",
      type: "invalid_request",
    });
  }

  try {
    const validation = validateBody(proxyAssignmentSchema, rawBody);
    if (isValidationFailure(validation)) {
      return createErrorResponse({
        status: 400,
        message: validation.error.message,
        details: validation.error.details,
        type: "invalid_request",
      });
    }

    const { scope, scopeId, proxyId } = validation.data;
    const assigned = await assignProxyToScope(scope, scopeId || null, proxyId || null);
    clearDispatcherCache();
    return Response.json({ success: true, assignment: assigned });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to update assignment");
  }
}
