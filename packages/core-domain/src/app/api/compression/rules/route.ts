import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import { getCavemanRuleMetadata } from "../../../../../open-sse/services/compression/cavemanRules.ts";

export async function GET(req: Request) {
  const authError = await requireManagementAuth(req);
  if (authError) return authError;

  return NextResponse.json({
    rules: getCavemanRuleMetadata(),
  });
}
