import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import { buildWebSessionContract } from "../../../../lib/providers/webSessionContract.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  return NextResponse.json(buildWebSessionContract());
}
