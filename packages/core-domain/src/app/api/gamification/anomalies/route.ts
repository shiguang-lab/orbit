import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, handleCorsOptions } from "../../../../shared/utils/cors.ts";
import { getAnomalies } from "../../../../lib/gamification/antiCheat.ts";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/gamification/anomalies — Admin anomaly list
 */
export async function GET(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const anomalies = await getAnomalies();
  return NextResponse.json({ anomalies }, { headers: CORS_HEADERS });
}
