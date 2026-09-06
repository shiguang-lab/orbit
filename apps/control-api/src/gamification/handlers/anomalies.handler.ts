import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { getAnomalies } from "@shiguang-gateway/core-domain/control/gamification";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/gamification/anomalies — Admin anomaly list
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const anomalies = await getAnomalies();
  return Response.json({ anomalies }, { headers: CORS_HEADERS });
}
