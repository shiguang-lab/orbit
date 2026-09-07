import { getApiKeyById } from "@orbit/core/db/api-keys";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getApiKeyUsageLimitStatus } from "@orbit/core/usage/api-key-limits";
import * as log from "@orbit/core/sse/logger";
import { json } from "./response.js";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = params;
    const key = await getApiKeyById(id);
    if (!key || typeof key.id !== "string") return json({ error: "Key not found" }, { status: 404 });
    const status = await getApiKeyUsageLimitStatus({
      id: key.id,
      allowedConnections: Array.isArray(key.allowedConnections) ? key.allowedConnections : [],
      usageLimitEnabled: key.usageLimitEnabled === true,
      dailyUsageLimitUsd: typeof key.dailyUsageLimitUsd === "number" ? key.dailyUsageLimitUsd : null,
      weeklyUsageLimitUsd: typeof key.weeklyUsageLimitUsd === "number" ? key.weeklyUsageLimitUsd : null,
    });
    return json({ key: { id: key.id, name: typeof key.name === "string" ? key.name : "", usageLimitEnabled: key.usageLimitEnabled === true, dailyUsageLimitUsd: typeof key.dailyUsageLimitUsd === "number" ? key.dailyUsageLimitUsd : null, weeklyUsageLimitUsd: typeof key.weeklyUsageLimitUsd === "number" ? key.weeklyUsageLimitUsd : null }, status });
  } catch (error) {
    log.error("keys", "Error fetching API key usage limits", error);
    return json({ error: "Failed to fetch usage limits" }, { status: 500 });
  }
}
