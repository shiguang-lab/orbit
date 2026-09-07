import type { ProviderCredentialRefreshResult } from "@orbit/contracts/edge-runtime-command";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/** POST /api/providers/:id/refresh-token. */
export async function POST(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const result = await executeEdgeRuntimeCommand<ProviderCredentialRefreshResult>({
    command: "provider-credentials.refresh",
    connectionId: id,
    purpose: "kimi-manual",
  });
  switch (result.outcome) {
    case "not-found":
      return Response.json({ error: `Provider connection ${id} not found` }, { status: 404 });
    case "invalid":
      return Response.json({ error: result.error }, { status: result.status === 422 ? 400 : result.status });
    case "reauth-required":
    case "failed":
      return Response.json({ error: result.error }, { status: 400 });
    case "skipped":
      return Response.json({ error: result.message }, { status: 400 });
    case "refreshed":
      return Response.json({
        success: true,
        message: "Token refreshed successfully",
        expiresAt: result.expiresAt,
        user: result.user ?? { userId: null, region: null, spaceId: null },
      });
  }
}
