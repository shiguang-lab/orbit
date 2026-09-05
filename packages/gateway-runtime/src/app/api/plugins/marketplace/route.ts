import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, handleCorsOptions } from "../../../../shared/utils/cors.ts";
import { buildErrorBody } from "../../../../../open-sse/utils/error.ts";
import { listMarketplacePlugins } from "../../../../lib/plugins/marketplace.ts";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/plugins/marketplace — List marketplace plugins
 */
export async function GET(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const plugins = await listMarketplacePlugins();
    return NextResponse.json(
      { plugins },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[plugins/marketplace] Failed to list marketplace plugins:", err);
    return NextResponse.json(buildErrorBody(500, "Failed to list marketplace plugins"), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
