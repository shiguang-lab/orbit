import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { MCP_TOOLS, MCP_TOOL_MAP } from "@orbit/inference/mcp-server/schemas/tools";

export async function listTools(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request, { acceptMcpConnectScope: true });
  if (authError) return authError;
  try {
    return Response.json({
      total: MCP_TOOLS.length,
      mappedTotal: Object.keys(MCP_TOOL_MAP).length,
      tools: MCP_TOOLS.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        scopes: [...tool.scopes],
        phase: tool.phase,
        auditLevel: tool.auditLevel,
        sourceEndpoints: [...tool.sourceEndpoints],
      })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load MCP tools" }, { status: 500 });
  }
}
