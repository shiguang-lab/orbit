import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getCallLogById } from "@orbit/core/usage/call-logs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;

    const { id } = params;
    const log = await getCallLogById(id);

    if (!log) {
      return Response.json({ error: "Log not found" }, { status: 404 });
    }

    return Response.json(log);
  } catch (error) {
    console.error("[API ERROR] /api/usage/call-logs/[id] failed:", error);
    return Response.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}
