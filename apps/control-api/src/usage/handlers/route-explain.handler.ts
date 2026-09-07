import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { explainRouteByRequestId } from "../reporting/routeExplain.js";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const explanation = await explainRouteByRequestId(params.id);
    if (!explanation) return Response.json({ error: "Routing decision not found" }, { status: 404 });
    return Response.json(explanation);
  } catch (error) {
    console.error("[API ERROR] /api/usage/route-explain/[id] failed:", error);
    return Response.json({ error: "Failed to explain route" }, { status: 500 });
  }
}
