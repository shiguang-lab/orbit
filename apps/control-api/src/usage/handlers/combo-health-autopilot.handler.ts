import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildComboHealthAutopilotReport } from "@shiguang-gateway/core-domain/usage/combo-health-autopilot";

const schema = z.object({ range: z.enum(["1h", "24h", "7d", "30d"]).default("24h"), horizon: z.enum(["24h", "7d", "30d"]).default("30d"), comboId: z.string().uuid().optional(), includeHealthy: z.enum(["true", "false"]).transform((v) => v === "true").default(false), includeActions: z.enum(["true", "false"]).transform((v) => v === "true").default(true) });

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request); if (authError) return authError;
  const p = new URL(request.url).searchParams;
  const parsed = schema.safeParse({ range: p.get("range") || undefined, horizon: p.get("horizon") || undefined, comboId: p.get("comboId") || undefined, includeHealthy: p.get("includeHealthy") || undefined, includeActions: p.get("includeActions") || undefined });
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" }, { status: 400 });
  try {
    const report = await buildComboHealthAutopilotReport(parsed.data) as { summary?: { comboCount?: number } };
    if (parsed.data.comboId && (report.summary?.comboCount ?? 0) === 0) return Response.json({ error: "Combo not found" }, { status: 404 });
    return Response.json(report);
  } catch (error) { console.error("[API] GET /api/usage/combo-health-autopilot error:", error); return Response.json({ error: "Failed to build combo health autopilot report" }, { status: 500 }); }
}
