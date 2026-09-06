import { Injectable } from "@nestjs/common";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { computeFreeProviderRankings } from "@shiguang-gateway/core-domain/control/free-provider-rankings";
import { buildFreeTierSummary } from "@shiguang-gateway/core-domain/control/free-tier-summary";
import { freeProviderRankingsQuerySchema } from "./free-tier.schemas.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

@Injectable()
export class FreeTierService {
  options(): Response {
    return new Response(null, { status: 204, headers: CORS });
  }

  async rankings(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parsed = freeProviderRankingsQuerySchema.safeParse({
      category: url.searchParams.get("category") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      configuredOnly: url.searchParams.get("configuredOnly") || undefined,
      availableOnly: url.searchParams.get("availableOnly") || undefined,
      withUsage: url.searchParams.get("withUsage") || undefined,
      usageRange: url.searchParams.get("usageRange") || undefined,
    });
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { category, limit, configuredOnly, availableOnly, withUsage, usageRange } = parsed.data;
    const rankings = await computeFreeProviderRankings(category, limit, {
      configuredOnly,
      availableOnly,
      withUsage,
      usageRange,
    });
    return Response.json({ rankings }, { headers: CORS_HEADERS });
  }

  summary(request: Request, authenticated: boolean): Response {
    const excludeTosAvoid = new URL(request.url).searchParams.get("excludeTosAvoid") === "1";
    return Response.json(buildFreeTierSummary({ excludeTosAvoid, authenticated }), { headers: CORS });
  }
}
