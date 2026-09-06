import { getCostSummary, checkBudget } from "@shiguang-gateway/core-domain/control/cost-rules";
import { getApiKeys } from "@shiguang-gateway/core-domain/db/api-keys";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const keys = await getApiKeys();
    const budgets: Record<string, ReturnType<typeof getCostSummary> & { budgetCheck: ReturnType<typeof checkBudget> }> = {};
    for (const key of keys) {
      const id = (key as { id?: string }).id;
      if (typeof id !== "string" || !id) continue;
      budgets[id] = { ...getCostSummary(id), budgetCheck: checkBudget(id) };
    }
    return Response.json({ budgets });
  } catch (error) {
    console.error("Error fetching bulk budget summary:", error);
    return Response.json({ error: "Failed to fetch bulk budget summary" }, { status: 500 });
  }
}
