import { getUnifiedModelsResponse } from "@shiguang-gateway/open-sse/catalog/unified";
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

/** GET /v1/models/{model} — return one model from the unified catalog. */
export async function GET(request: Request, requestedId: string): Promise<Response> {
  const listResponse = await getUnifiedModelsResponse(request, CORS_HEADERS);
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
