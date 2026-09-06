import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildComboHealthDashboardResponse } from "@shiguang-gateway/core-domain/usage/combo-health-dashboard";

const schema = z.object({ range: z.enum(["1h", "24h", "7d", "30d"]).default("24h"), horizon: z.enum(["24h", "7d", "30d"]).default("30d"), comboId: z.string().uuid().optional(), taskType: z.string().trim().min(1).max(64).optional() });

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request); if (authError) return authError;
  const p = new URL(request.url).searchParams;
  const parsed = schema.safeParse({ range: p.get("range") || undefined, horizon: p.get("horizon") || undefined, comboId: p.get("comboId") || undefined, taskType: p.get("taskType") || undefined });
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" }, { status: 400 });
  try {
    const response = await buildComboHealthDashboardResponse(parsed.data) as { health?: { combos?: unknown[] } };
    if (parsed.data.comboId && (!response.health?.combos || response.health.combos.length === 0)) return Response.json({ error: "Combo not found" }, { status: 404 });
    return Response.json(response);
  } catch (error) { console.error("[API] GET /api/usage/combo-health-dashboard error:", error); return Response.json({ error: "Failed to build combo health dashboard" }, { status: 500 }); }
}
