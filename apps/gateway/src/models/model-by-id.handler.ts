import { getUnifiedModelsResponse } from "@orbit/inference/catalog/unified";
import { CORS_HEADERS, handleCorsOptions } from "../common/cors.js";

type CatalogModel = { id?: unknown } & Record<string, unknown>;

/** Resolve an exact model id, falling back to a case-insensitive match. */
export function findModelById(
  data: CatalogModel[] | null | undefined,
  requestedId: string,
): CatalogModel | null {
  if (!Array.isArray(data)) return null;
  const exact = data.find((model) => typeof model?.id === "string" && model.id === requestedId);
  if (exact) return exact;
  const lower = requestedId.toLowerCase();
  return data.find((model) => typeof model?.id === "string" && model.id.toLowerCase() === lower) ?? null;
}

/** CORS preflight for a single OpenAI-compatible model lookup. */
export function OPTIONS(): Response {
  return handleCorsOptions();
}

/** Explicit HEAD response avoids rebuilding the full catalog for probes. */
export function HEAD(): Response {
  return new Response(null, {
    status: 200,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

/**
 * Exact model lookup must use the expanded projection: effort aliases are
 * intentionally omitted from the default list response, but remain valid
 * callable model IDs and therefore must resolve through this endpoint.
 */
function expandedCatalogRequest(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.set("effort_variants", "expanded");
  return new Request(url, request);
}

/** GET /v1/models/{model} — return one model from the unified catalog. */
export async function GET(request: Request, requestedId: string): Promise<Response> {
  const listResponse = await getUnifiedModelsResponse(expandedCatalogRequest(request), CORS_HEADERS);
  // Preserve authentication rejections and upstream failures unchanged.
  if (!listResponse.ok) return listResponse;

  let data: CatalogModel[] | undefined;
  try {
    data = (await listResponse.json() as { data?: CatalogModel[] })?.data;
  } catch {
    data = undefined;
  }

  const model = findModelById(data, requestedId);
  if (model) return Response.json(model, { headers: CORS_HEADERS });

  return Response.json(
    {
      error: {
        message: `The model '${requestedId}' does not exist`,
        type: "invalid_request_error",
        code: "model_not_found",
      },
    },
    { status: 404, headers: CORS_HEADERS },
  );
}
