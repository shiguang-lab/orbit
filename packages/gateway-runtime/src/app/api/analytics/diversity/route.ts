import { NextResponse } from "next/server";
import { getDiversityReport } from "../../../../../open-sse/services/autoCombo/providerDiversity";
import { sanitizeErrorMessage } from "../../../../../open-sse/utils/error.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = getDiversityReport();
    return NextResponse.json(report);
  } catch (error: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
