import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildComboForecastResponse } from "@shiguang-gateway/core-domain/usage/combo-forecast";

const schema = z.object({ range: z.enum(["1h", "24h", "7d", "30d"]).default("7d"), horizon: z.enum(["24h", "7d", "30d"]).default("30d"), comboId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).optional() });

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request); if (authError) return authError;
  const p = new URL(request.url).searchParams;
  const parsed = schema.safeParse({ range: p.get("range") || undefined, horizon: p.get("horizon") || undefined, comboId: p.get("comboId") || undefined });
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" }, { status: 400 });
  try {
    const response = await buildComboForecastResponse(parsed.data);
    const result = response as { combos?: unknown[] };
    if (parsed.data.comboId && (!result.combos || result.combos.length === 0)) return Response.json({ error: "Combo not found" }, { status: 404 });
    return Response.json(response);
  } catch (error) { console.error("[API] GET /api/usage/combo-forecast error:", error); return Response.json({ error: "Failed to build combo forecast" }, { status: 500 }); }
}
