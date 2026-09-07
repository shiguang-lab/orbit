import { getCachedProviderConnectionById } from "@orbit/core/db/read-cache";
import { updateProviderConnection } from "@orbit/core/db/provider-connections";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { tryIdeAuth } from "@orbit/core/control/cursor-token-extractor";
import {
  renewCursorConnection,
  buildCursorRenewedUpdate,
  runCursorRenewalExclusive,
  BACKGROUND_IDE_AUTH_TIMEOUT_MS,
} from "@orbit/core/providers/cursor-session";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

const MANUAL_REFRESH_COOLDOWN_MS = 30_000;
const lastManualRefreshAttemptAt = new Map<string, number>();

function uncachedTryIdeAuth(): Promise<any> {
  return tryIdeAuth({ timeoutMs: BACKGROUND_IDE_AUTH_TIMEOUT_MS });
}

function evictExpired(now: number): void {
  for (const [id, attemptedAt] of lastManualRefreshAttemptAt) {
    if (now - attemptedAt >= MANUAL_REFRESH_COOLDOWN_MS) lastManualRefreshAttemptAt.delete(id);
  }
}

/** POST /api/providers/:id/refresh-cursor. Cursor uses host-local credentials. */
export async function POST(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const connection = await getCachedProviderConnectionById(id) as any;
    if (!connection) return Response.json({ error: "Connection not found" }, { status: 404 });
    if (connection.provider !== "cursor") return Response.json({ error: "This route only supports Cursor connections" }, { status: 400 });

    const now = Date.now();
    evictExpired(now);
    const previous = lastManualRefreshAttemptAt.get(connection.id) ?? 0;
    if (now - previous < MANUAL_REFRESH_COOLDOWN_MS) {
      const retryAfterMs = MANUAL_REFRESH_COOLDOWN_MS - (now - previous);
      return Response.json(
        { error: "Refresh already attempted recently — please wait before retrying.", retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }
    lastManualRefreshAttemptAt.set(connection.id, now);

    return await runCursorRenewalExclusive(connection.id, async () => {
      const result = await renewCursorConnection(
        { accessToken: connection.accessToken ?? "", machineId: connection.providerSpecificData?.machineId ?? null },
        { tryIdeAuth: uncachedTryIdeAuth },
      );
      if (result.status === "renewed") {
        const refreshedAt = new Date().toISOString();
        const update = buildCursorRenewedUpdate(connection, result, refreshedAt);
        await updateProviderConnection(connection.id, update);
        return Response.json({ success: true, connectionId: connection.id, provider: "cursor", expiresAt: update.expiresAt, refreshedAt });
      }
      if (result.status === "unchanged") {
        return Response.json({ success: true, unchanged: true, connectionId: connection.id, provider: "cursor", expiresAt: connection.expiresAt ?? null, refreshedAt: new Date().toISOString(), message: "Cursor session is already current — no newer token found on this host." });
      }
      return Response.json({ error: "Token refresh failed — provider returned no new token", details: result.error }, { status: 502 });
    });
  } catch (error) {
    return Response.json({ error: "Token refresh failed", details: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
