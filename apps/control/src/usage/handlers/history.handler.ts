import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getUsageStats } from "@orbit/core/usage/stats";

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
