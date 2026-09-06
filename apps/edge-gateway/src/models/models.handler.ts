import { getUnifiedModelsResponse } from "@shiguang-gateway/open-sse/catalog/unified";
import { CORS_HEADERS, handleCorsOptions } from "../common/cors.js";

/** CORS preflight for the OpenAI-compatible model catalog endpoints. */
export function OPTIONS(): Response {
  return handleCorsOptions();
}

/** Explicit HEAD response avoids rebuilding the full catalog for health probes. */
export function HEAD(): Response {
  return new Response(null, {
    status: 200,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

/** GET /v1/models — OpenAI-compatible model catalog. */
export function GET(request: Request): Promise<Response> {
  return getUnifiedModelsResponse(request, CORS_HEADERS, {
    // Nest has no Next request lifecycle hook. Yield to Fastify before a stale
    // catalog refresh starts so the response can be dispatched first.
    scheduleBackgroundRefresh: (task) => {
      setImmediate(() => {
        void task();
      });
    },
  });
}

/** GET /v1 — compatibility alias for the model catalog. */
export function GET_ROOT(request: Request): Promise<Response> {
  return getUnifiedModelsResponse(request, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
}
