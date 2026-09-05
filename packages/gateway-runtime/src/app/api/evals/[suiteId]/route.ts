import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import { getSuite } from "../../../../lib/evals/evalRunner.ts";
import { sanitizeErrorMessage } from "../../../../../open-sse/utils/error.ts";

export async function GET(request: Request, { params }: { params: Promise<{ suiteId: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { suiteId } = await params;
    const suite = getSuite(suiteId);
    if (!suite) {
      return NextResponse.json({ error: `Suite not found: ${suiteId}` }, { status: 404 });
    }
    return NextResponse.json(suite);
  } catch (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
