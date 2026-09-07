import { z } from "zod";
import { buildCacheHealthResponse } from "@orbit/core/usage/cache-health";

const querySchema = z.object({
  range: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
  model: z.string().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({ range: params.get("range") ?? undefined, model: params.get("model") || undefined });
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" }, { status: 400 });
    return Response.json(buildCacheHealthResponse(parsed.data));
  } catch (error) {
    console.error("Error building cache health summary:", error);
    return Response.json({ error: "Failed to build cache health summary" }, { status: 500 });
  }
}
