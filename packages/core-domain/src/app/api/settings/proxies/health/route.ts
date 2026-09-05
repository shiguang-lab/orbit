import { getProxyHealthStats } from "../../../../../lib/localDb.ts";
import { createErrorResponseFromUnknown } from "../../../../../lib/api/errorResponse.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const hours = Number(searchParams.get("hours") || 24);
    const items = await getProxyHealthStats({ hours });
    return Response.json({ items, total: items.length, windowHours: hours });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to load proxy health stats");
  }
}
