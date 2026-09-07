import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getModelLatencyStats } from "@orbit/core/usage/model-latency-stats";

const querySchema = z.object({
  windowHours: z.coerce.number().positive().max(24 * 30).optional(),
  minSamples: z.coerce.number().int().positive().optional(),
  maxRows: z.coerce.number().int().positive().max(50000).optional(),
  provider: z.string().trim().min(1).max(64).optional(),
  model: z.string().trim().min(1).max(256).optional(),
});

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const params = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      windowHours: params.get("windowHours") || undefined,
      minSamples: params.get("minSamples") || undefined,
      maxRows: params.get("maxRows") || undefined,
      provider: params.get("provider") || undefined,
      model: params.get("model") || undefined,
    });
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" }, { status: 400 });
    }
    const { windowHours, minSamples, maxRows, provider, model } = parsed.data;
    const statsByKey = await getModelLatencyStats({ windowHours, minSamples, maxRows, provider, model });
    return Response.json({ entries: Object.values(statsByKey), windowHours: windowHours ?? 24, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[API] GET /api/usage/model-latency-stats error:", error);
    return Response.json({ error: "Failed to build model latency stats" }, { status: 500 });
  }
}
