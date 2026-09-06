import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getUsageStats } from "@shiguang-gateway/core-domain/usage/stats";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    return Response.json(await getUsageStats());
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return Response.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
