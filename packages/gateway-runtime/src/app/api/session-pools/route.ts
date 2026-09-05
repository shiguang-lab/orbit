import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../lib/api/requireManagementAuth.ts";
import { getWebSessionPoolHealth } from "../../../../open-sse/services/webSessionPoolHealth.ts";
import { sanitizeErrorMessage } from "../../../../open-sse/utils/error.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const report = getWebSessionPoolHealth();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || "Failed to get session pool health" },
      { status: 500 }
    );
  }
}
