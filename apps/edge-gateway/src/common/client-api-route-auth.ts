/**
 * Route-level authentication guard for CLIENT_API (`/api/v1/*`) handlers.
 *
 * Defence-in-depth companion to `clientApiPolicy`
 * (src/server/authz/policies/clientApi.ts), which already fronts these routes
 * through `src/proxy.ts`. The handler-level check must never be *stricter*
 * than the middleware, otherwise callers the pipeline admits get a 401 from
 * the route instead:
 *
 *  - a presented key must be valid, but is only rejected while
 *    `REQUIRE_API_KEY=true`; with enforcement off a stale CLI key degrades to
 *    anonymous instead of failing the whole request (#2257);
 *  - a cookie-authenticated dashboard session is accepted in place of a key —
 *    the dashboard Media page and Playground call these routes with a session
 *    only (same fix as the preset auth mismatch in
 *    `src/app/api/playground/presets/route.ts`);
 *  - anonymous traffic stays allowed while `REQUIRE_API_KEY=false`.
 *
 * @module apps/edge-gateway/common/client-api-route-auth
 */

import { errorResponse } from "@orbit/utils/errors/error-response";
import { HTTP_STATUS } from "@orbit/contracts/http-status";
import { extractApiKey, isValidGatewayApiKey } from "@orbit/auth";
import { validateApiKey } from "@orbit/core/db/api-keys";
import { isRequireApiKeyEnabled } from "@orbit/core/runtime/feature-flags";
import { isDashboardSessionAuthenticated } from "@orbit/auth/dashboard-session";

export interface ClientApiRouteAuthDependencies {
  extractApiKey: (request: Request) => string | null;
  isValidGatewayApiKey: (
    apiKey: string,
    validate: (apiKey: string) => Promise<boolean>,
  ) => Promise<boolean>;
  validateApiKey: (apiKey: string) => Promise<boolean>;
  isRequireApiKeyEnabled: () => boolean;
  isDashboardSessionAuthenticated: (request: Request) => Promise<boolean>;
}

const defaultDependencies: ClientApiRouteAuthDependencies = {
  extractApiKey,
  isValidGatewayApiKey,
  validateApiKey,
  isRequireApiKeyEnabled,
  isDashboardSessionAuthenticated,
};

/**
 * Authenticate a client-API request at the route level.
 *
 * @param request - The incoming request.
 * @returns A 401 `Response` the handler must return, or `null` when the
 *          request may proceed to policy enforcement.
 */
export async function enforceClientApiRouteAuth(
  request: Request,
  dependencies: ClientApiRouteAuthDependencies = defaultDependencies,
): Promise<Response | null> {
  const apiKeyRaw = dependencies.extractApiKey(request);

  if (apiKeyRaw) {
    if (await dependencies.isValidGatewayApiKey(apiKeyRaw, dependencies.validateApiKey)) return null;
    return dependencies.isRequireApiKeyEnabled()
      ? errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key")
      : null;
  }

  if (await dependencies.isDashboardSessionAuthenticated(request)) return null;

  return dependencies.isRequireApiKeyEnabled()
    ? errorResponse(HTTP_STATUS.UNAUTHORIZED, "Authentication required")
    : null;
}
