import { NextResponse } from "next/server";
import { MCP_TOOLS, MCP_TOOL_MAP } from "../../../../../open-sse/mcp-server/schemas/tools.ts";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request, { acceptMcpConnectScope: true });
  if (authError) return authError;
  try {
    return NextResponse.json({
      total: MCP_TOOLS.length,
      mappedTotal: Object.keys(MCP_TOOL_MAP).length,
      tools: MCP_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        scopes: [...tool.scopes],
        phase: tool.phase,
        auditLevel: tool.auditLevel,
        sourceEndpoints: [...tool.sourceEndpoints],
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load MCP tools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
