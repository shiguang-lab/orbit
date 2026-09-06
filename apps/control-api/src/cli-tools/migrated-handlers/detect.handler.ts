import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { detectAllTools, detectTool } from "@shiguang-gateway/core-domain/control/cli-tools-tool-detector";

// GET /api/cli-tools/detect - Detect all installed CLI tools
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const toolId = searchParams.get("tool");

  try {
    if (toolId) {
      const tool = await detectTool(toolId);
      if (!tool) {
        return Response.json({ error: `Unknown tool: ${toolId}` }, { status: 400 });
      }
      return Response.json(tool);
    }

    const tools = await detectAllTools();
    return Response.json({ tools });
  } catch (error) {
    console.log("Error detecting tools:", error);
    return Response.json({ error: "Failed to detect tools" }, { status: 500 });
  }
}
