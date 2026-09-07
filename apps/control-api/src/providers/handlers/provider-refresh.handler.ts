import type { ProviderCredentialRefreshResult } from "@shiguang-gateway/contracts/edge-runtime-command";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/** POST /api/providers/[id]/refresh. */
export async function handleProviderRefresh(_request: Request, id: string) {
  try {
    const result = await executeEdgeRuntimeCommand<ProviderCredentialRefreshResult>({
      command: "provider-credentials.refresh",
      connectionId: id,
      purpose: "manual",
    });

    switch (result.outcome) {
      case "not-found":
        return Response.json({ error: "Connection not found" }, { status: 404 });
      case "invalid":
        return Response.json({ error: result.error }, { status: result.status });
      case "skipped":
        return Response.json({
          success: true,
          skipped: true,
          connectionId: result.connectionId,
          provider: result.provider,
          message: result.message,
          expiresAt: result.expiresAt,
          refreshedAt: new Date().toISOString(),
        });
      case "reauth-required":
        return Response.json({
          error: result.error,
          requiresReauth: true,
          ...(result.deprecated ? { deprecated: true, migrateTo: result.migrateTo } : {}),
        }, { status: 401 });
      case "failed":
        return Response.json({ error: result.error }, { status: 502 });
      case "refreshed":
        return Response.json({
          success: true,
          connectionId: result.connectionId,
          provider: result.provider,
          expiresAt: result.expiresAt,
          refreshedAt: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("[T12] Token refresh failed:", error);
    return Response.json(
      { error: "Token refresh failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
