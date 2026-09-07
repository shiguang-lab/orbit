/**
 * Shared authorization for the REST A2A task routes (GHSA-jcm5-6wpp-wjj8).
 *
 * Dual audience: the dashboard calls these routes with a management session,
 * A2A clients with an inference API key. Posture matrix:
 *
 *  - REQUIRE_API_KEY=true: a valid ShiguangGateway key is mandatory (the same
 *    posture the /v1 inference plane enforces); a management session also
 *    passes (dashboard), via alwaysRequireAuth so requireLogin=false cannot
 *    bypass it.
 *  - otherwise + requireLogin=true: management session, or a valid key.
 *  - otherwise + requireLogin=false (local-first default): open, by design.
 *
 * Callers authenticated by key are owner-scoped — another principal's tasks
 * answer as if they did not exist. Management/operator view sees all tasks.
 */

import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { isRequireApiKeyEnabled } from "@orbit/core/runtime/feature-flags";
import {
  extractA2AApiKey,
  isValidA2AApiKey,
  resolveA2AOwner,
} from "@orbit/core/a2a/runtime";

export interface A2ARestAuth {
  /** Owner scope for task reads/mutations; undefined = operator view (all tasks). */
  owner: string | undefined;
}

/**
 * NOTE: the failure branch is whatever requireManagementAuth returns — today a
 * plain `Response` from createErrorResponse(), NOT a NextResponse. Callers must
 * test with `instanceof Response` (NextResponse extends Response), never
 * `instanceof NextResponse`, or the 401 silently falls through to the handler.
 */
export async function authorizeA2ATaskRoute(request: Request): Promise<A2ARestAuth | Response> {
  const apiKey = extractA2AApiKey(request);

  if (isRequireApiKeyEnabled()) {
    if (apiKey && (await isValidA2AApiKey(apiKey))) return { owner: resolveA2AOwner(request) };
    const managementError = await requireManagementAuth(request, {
      invalidApiKeyStatus: 401,
      alwaysRequireAuth: true,
    });
    if (managementError === null) return { owner: undefined };
    return managementError;
  }

  const managementError = await requireManagementAuth(request, { invalidApiKeyStatus: 401 });
  if (managementError === null) return { owner: undefined };
  if (apiKey && (await isValidA2AApiKey(apiKey))) return { owner: resolveA2AOwner(request) };
  return managementError;
}
