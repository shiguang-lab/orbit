/**
 * GET /api/models/openrouter-catalog
 * Feature 09 — Retorna catálogo OpenRouter com cache persistente.
 *
 * Query params:
 *   ?refresh=true  — Force-refresh, ignores TTL
 */

import {
  getOpenRouterCatalog,
  getSettings,
  isAuthenticated,
  isFreeModel,
  refreshOpenRouterCatalog,
} from "@orbit/core/control/model-management";

export async function GET(req: Request) {
  // Require authentication (dashboard/API key)
  if (!(await isAuthenticated(req))) {
    return Response.json(
      { error: { message: "Authentication required", type: "invalid_request_error" } },
      { status: 401 }
    );
  }

  // #6328 (follow-up to #6495): REMOVE — not just hide — paid models from the
  // OpenRouter catalog echo when hidePaidModels is on. Fail open on settings read.
  let hidePaid = false;
  try {
    const settings = await getSettings();
    hidePaid = settings?.hidePaidModels === true;
  } catch {}
  const applyFilter = <T extends { id?: string; pricing?: unknown; isFree?: boolean }>(data: T[]): T[] =>
    hidePaid
      ? data.filter((model) => {
          const pricing = model.pricing;
          return isFreeModel("or", {
            id: model.id,
            isFree: model.isFree,
            pricing:
              pricing && typeof pricing === "object" && !Array.isArray(pricing)
                ? {
                    prompt: (pricing as Record<string, unknown>).prompt as string | number | undefined,
                    completion: (pricing as Record<string, unknown>).completion as string | number | undefined,
                  }
                : undefined,
          });
        })
      : data;

  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "true";

  if (forceRefresh) {
    const result = await refreshOpenRouterCatalog();
    const data = applyFilter(result.data);
    return Response.json({
      object: "list",
      data,
      meta: {
        source: result.ok ? "fresh" : "error",
        count: data.length,
        error: result.error ?? undefined,
      },
    });
  }

  const result = await getOpenRouterCatalog();
  const data = applyFilter(result.data);
  return Response.json({
    object: "list",
    data,
    meta: {
      source: result.fromCache ? (result.stale ? "stale-cache" : "cache") : "fresh",
      cachedAt: result.cachedAt ?? undefined,
      stale: result.stale,
      count: data.length,
    },
  });
}
