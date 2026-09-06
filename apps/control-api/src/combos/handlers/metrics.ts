import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

type ComboMetricsApi = {
  getAllComboMetrics(): unknown;
  getComboMetrics(name: string): unknown;
  resetComboMetrics(name: string): void;
  resetAllComboMetrics(): void;
};

const load = (specifier: string): Promise<any> => import(specifier);

async function metricsApi(): Promise<ComboMetricsApi> {
  return (await load("@shiguang-gateway/open-sse/services/comboMetrics")) as ComboMetricsApi;
}

/** GET/DELETE /api/combos/metrics. */
export async function getMetrics(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { getComboMetrics, getAllComboMetrics } = await metricsApi();
    const comboName = new URL(request.url).searchParams.get("combo");
    if (comboName) {
      const metrics = getComboMetrics(comboName);
      return Response.json(metrics ? { metrics } : { metrics: null, message: "No metrics for this combo yet" });
    }
    return Response.json({ metrics: getAllComboMetrics() });
  } catch (error) {
    console.error("Error fetching combo metrics:", error);
    return Response.json({ error: "Failed to fetch combo metrics" }, { status: 500 });
  }
}

export async function resetMetrics(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { resetComboMetrics, resetAllComboMetrics } = await metricsApi();
    const comboName = new URL(request.url).searchParams.get("combo");
    if (comboName) {
      resetComboMetrics(comboName);
      return Response.json({ success: true, message: `Metrics reset for ${comboName}` });
    }
    resetAllComboMetrics();
    return Response.json({ success: true, message: "All combo metrics reset" });
  } catch (error) {
    console.error("Error resetting combo metrics:", error);
    return Response.json({ error: "Failed to reset combo metrics" }, { status: 500 });
  }
}
