/**
 * GET /v1/combos — API-key safe read of combo metadata.
 *
 * Issue #2300: `/api/combos` is management-gated, which blocks integrations
 * like `opencode-shiguangGateway-auth` that need to enrich combo capabilities from
 * a normal Bearer API key. This endpoint exposes the same public metadata
 * with the API-key auth model used by `/v1/models` and projects out internal
 * routing details (account/connection ids, weights, internal labels).
 */
import { getCombos } from "@orbit/core/db/combos";
import { extractApiKey, isValidApiKey } from "@orbit/inference/services/auth";
import { isDashboardSessionAuthenticated } from "@orbit/auth/dashboard-session";
import { isRequireApiKeyEnabled } from "@orbit/core/runtime/feature-flags";
import { errorResponse } from "@orbit/inference/utils/error";
import { projectCombo, type PublicCombo } from "./runtime/project-combo.js";

const HTTP_STATUS = { UNAUTHORIZED: 401, SERVER_ERROR: 500 } as const;

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request: Request) {
  // Accept: (1) valid Bearer API key, (2) dashboard session cookie. Reject
  // anonymous requests so combo metadata isn't world-readable on a deployed
  // proxy unless the operator has explicitly disabled API-key enforcement.
  const apiKeyRaw = extractApiKey(request);
  const apiKeyOk = apiKeyRaw ? await isValidApiKey(apiKeyRaw) : false;
  const dashboardOk = !apiKeyOk ? await isDashboardSessionAuthenticated(request) : false;

  if (!apiKeyOk && !dashboardOk) {
    if (isRequireApiKeyEnabled()) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    }
    // REQUIRE_API_KEY=false → still allow anonymous read of public metadata.
    // This mirrors the /v1/models behavior on single-user local deployments.
  }

  try {
    const combos = await getCombos();
    const data = (Array.isArray(combos) ? combos : [])
      // #3979: advertise resolved capabilities so importing clients enable them
      .map((c) => projectCombo(c as Record<string, unknown>, { includeCapabilities: true }))
      .filter((c): c is PublicCombo => c !== null);

    return new Response(JSON.stringify({ object: "list", data }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return errorResponse(HTTP_STATUS.SERVER_ERROR, "Failed to fetch combos");
  }
}
