import { NextResponse } from "next/server";
import { getAuditStats } from "../../../../../../open-sse/mcp-server/audit.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const stats = await getAuditStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load MCP audit stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
