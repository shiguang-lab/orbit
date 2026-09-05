import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";
import { createErrorResponseFromUnknown } from "../../../../../lib/api/errorResponse.ts";
import { getFreeProxyStats } from "../../../../../lib/localDb.ts";
import { getAllProviders } from "../../../../../lib/freeProxyProviders/index.ts";
import {
  isFreeProxyAutoSyncEnabled,
  getFreeProxyAutoSyncIntervalMs,
} from "../../../../../lib/freeProxyProviders/scheduler.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const stats = await getFreeProxyStats();
    const providers = getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.isEnabled(),
    }));
    const autoSync = {
      enabled: isFreeProxyAutoSyncEnabled(),
      intervalMs: getFreeProxyAutoSyncIntervalMs(),
    };
    return Response.json({ stats, providers, autoSync });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to get free proxy stats");
  }
}
