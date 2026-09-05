import { NextResponse } from "next/server";
import { verifyExtractionPipeline } from "../../../../lib/memory/verify.ts";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const result = await verifyExtractionPipeline("health-check");
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { working: false, latencyMs: 0, error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}
