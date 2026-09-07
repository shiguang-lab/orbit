import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getRecentLogs } from "@orbit/core/usage/request-logs";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const logs = await getRecentLogs(200);
    return Response.json(logs);
  } catch (error) {
    console.error("[API ERROR] /api/usage/logs failed:", error);
    console.error("[API ERROR] Stack:", error instanceof Error ? error.stack : undefined);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
