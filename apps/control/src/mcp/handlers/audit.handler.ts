import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getAuditStats, queryAuditEntries } from "@orbit/inference/mcp-server/audit";

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

function parseNumberParam(value: string | null, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function listAuditEntries(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(await queryAuditEntries({
      limit: parseNumberParam(params.get("limit"), 50),
      offset: parseNumberParam(params.get("offset"), 0),
      tool: params.get("tool") || undefined,
      success: parseBooleanParam(params.get("success")),
      apiKeyId: params.get("apiKeyId") || undefined,
    }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load MCP audit log" }, { status: 500 });
  }
}

export async function getAuditStatistics(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    return Response.json(await getAuditStats());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load MCP audit stats" }, { status: 500 });
  }
}
