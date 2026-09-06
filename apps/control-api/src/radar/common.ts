import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isFeatureFlagEnabled } from "@shiguang-gateway/core-domain/edge/feature-flags";
import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { radarSyncBodyError, validateRadarSyncBody } from "./sync-request.js";

export { CORS_HEADERS, handleCorsOptions, radarSyncBodyError, validateRadarSyncBody };

export function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { headers: { ...CORS_HEADERS, ...(init.headers ?? {}) }, ...init });
}

export function error(status: number, message: string): Response {
  return json(buildErrorBody(status, message), { status });
}

export async function authorize(request: Request): Promise<Response | null> {
  if (!isFeatureFlagEnabled("RADAR_ENABLED")) return error(404, "Not found");
  if (!(await isAuthenticated(request))) return error(401, "Unauthorized");
  return null;
}

export async function withRadarSyncBody(request: Request): Promise<Response | null> {
  const bodyError = radarSyncBodyError(await validateRadarSyncBody(request));
  return bodyError ? error(bodyError.status, bodyError.message) : null;
}

export function internalError(cause: unknown, fallback: string): Response {
  return error(500, sanitizeErrorMessage(cause) || fallback);
}
