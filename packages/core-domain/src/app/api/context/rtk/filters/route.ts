import { NextResponse } from "next/server";
import {
  getRtkFilterCatalog,
  getRtkFilterLoadDiagnostics,
} from "../../../../../../../open-sse/services/compression/engines/rtk/filterLoader.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  return NextResponse.json({
    filters: getRtkFilterCatalog(),
    diagnostics: getRtkFilterLoadDiagnostics(),
  });
}
