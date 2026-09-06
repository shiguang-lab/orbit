import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getProviderWindowCostBreakdown } from "@shiguang-gateway/core-domain/usage/provider-window-costs";

const PROVIDER_RE = /^[a-z0-9._-]{1,80}$/i;

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const params = new URL(request.url).searchParams;
    const provider = (params.get("provider") || "").trim().toLowerCase();
    const connectionId = (params.get("connectionId") || "").trim() || null;
    if (!provider || !PROVIDER_RE.test(provider)) return Response.json({ error: "provider query param is required" }, { status: 400 });
    return Response.json(await getProviderWindowCostBreakdown({ provider, connectionId }));
  } catch (error) {
    console.error("[API] GET /api/usage/provider-window-costs error:", error);
    return Response.json({ error: "Failed to fetch provider USD costs" }, { status: 500 });
  }
}
