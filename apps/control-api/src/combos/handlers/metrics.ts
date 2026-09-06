import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/** GET/DELETE /api/combos/metrics. */
export async function getMetrics(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const comboName = new URL(request.url).searchParams.get("combo");
    const { metrics } = await executeEdgeRuntimeCommand<{ metrics: unknown }>({
      command: "combo-metrics.snapshot",
      ...(comboName ? { combo: comboName } : {}),
    });
    if (comboName) {
      return Response.json(metrics ? { metrics } : { metrics: null, message: "No metrics for this combo yet" });
    }
    return Response.json({ metrics });
  } catch (error) {
    console.error("Error fetching combo metrics:", error);
    return Response.json({ error: "Failed to fetch combo metrics" }, { status: 500 });
  }
}

export async function resetMetrics(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const comboName = new URL(request.url).searchParams.get("combo");
    await executeEdgeRuntimeCommand({
      command: "combo-metrics.reset",
      ...(comboName ? { combo: comboName } : {}),
    });
    if (comboName) {
      return Response.json({ success: true, message: `Metrics reset for ${comboName}` });
    }
    return Response.json({ success: true, message: "All combo metrics reset" });
  } catch (error) {
    console.error("Error resetting combo metrics:", error);
    return Response.json({ error: "Failed to reset combo metrics" }, { status: 500 });
  }
}
