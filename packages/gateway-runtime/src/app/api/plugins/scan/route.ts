import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, handleCorsOptions } from "../../../../shared/utils/cors.ts";
import { buildErrorBody } from "../../../../../open-sse/utils/error.ts";
import { pluginManager } from "../../../../lib/plugins/manager.ts";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/plugins/scan — Scan plugin directory for new plugins
 */
export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const result = await pluginManager.scan();
    return NextResponse.json(
      { discovered: result.discovered, errors: result.errors },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[plugins] Failed to scan plugin directory:", err);
    return NextResponse.json(buildErrorBody(500, "Failed to scan plugin directory"), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
