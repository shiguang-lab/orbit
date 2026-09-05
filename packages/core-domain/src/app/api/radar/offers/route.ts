/** GET the verified local Radar offers cache. Never proxies the private service. */

import { NextResponse } from "next/server";
import { buildErrorBody, sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";
import { getRadarOffers } from "../../../../lib/radar/index.ts";
import { isAuthenticated } from "../../../../shared/utils/apiAuth.ts";
import { CORS_HEADERS, handleCorsOptions } from "../../../../shared/utils/cors.ts";
import { isFeatureFlagEnabled } from "../../../../shared/utils/featureFlags.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  if (!isFeatureFlagEnabled("RADAR_ENABLED")) {
    return NextResponse.json(buildErrorBody(404, "Not found"), {
      status: 404,
      headers: CORS_HEADERS,
    });
  }
  if (!(await isAuthenticated(request))) {
    return NextResponse.json(buildErrorBody(401, "Unauthorized"), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  try {
    return NextResponse.json(getRadarOffers(), {
      headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      buildErrorBody(500, sanitizeErrorMessage(error) || "Failed to load Radar offers"),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
