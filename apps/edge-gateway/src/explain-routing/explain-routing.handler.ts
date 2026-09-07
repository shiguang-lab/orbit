import { HTTP_STATUS } from "@orbit/inference/config/constants";
import { errorResponse } from "@orbit/inference/utils/error";
import {
  classifyQuality,
  initRoutingObservability,
  recentRoutingEvents,
  routingOtelStats,
  routingQualitySnapshot,
} from "@orbit/inference/services/routing";
import { isDashboardSessionAuthenticated } from "@orbit/auth/dashboard-session";
import { isRequireApiKeyEnabled } from "@orbit/core/runtime/feature-flags";
import { extractApiKey, isValidApiKey } from "@orbit/inference/services/auth";

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const apiKeyRaw = extractApiKey(request);
  const apiKeyOk = apiKeyRaw ? await isValidApiKey(apiKeyRaw) : false;
  const dashboardOk = !apiKeyOk ? await isDashboardSessionAuthenticated(request) : false;

  if (!apiKeyOk && !dashboardOk && isRequireApiKeyEnabled()) {
    return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Authentication required");
  }

  try {
    const limit = Math.min(
      500,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 50),
    );
    const { sinks, otelEnabled } = initRoutingObservability();
    const quality = routingQualitySnapshot(limit).map((q) => ({
      ...q,
      classification: classifyQuality(q),
    }));
    return Response.json(
      {
        object: "routing_explain",
        sinks,
        otelEnabled,
        events: recentRoutingEvents(limit),
        quality,
        otel: routingOtelStats(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return errorResponse(HTTP_STATUS.SERVER_ERROR, "Failed to build routing explain payload");
  }
}
