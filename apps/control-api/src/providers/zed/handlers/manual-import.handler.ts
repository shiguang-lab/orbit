/**
 * POST /api/providers/zed/manual-import
 *
 * Accepts a manually-pasted Zed API token for a specific provider.
 * Intended for Docker/headless deployments where keychain access is unavailable.
 *
 * Security: protected by requireManagementAuth.
 */

import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { createProviderConnection } from "@shiguang-gateway/core-domain/db/provider-connections";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";

const manualImportSchema = z.object({
  provider: z.string().min(1).max(64),
  token: z.string().min(1).max(512),
  label: z.string().max(128).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(buildErrorBody(400, "Invalid JSON body"), { status: 400 });
  }

  const parsed = manualImportSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      buildErrorBody(
        400,
        "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ")
      ),
      { status: 400 }
    );
  }

  const { provider, token, label } = parsed.data;

  try {
    const connection = await createProviderConnection({
      provider,
      authType: "apikey",
      apiKey: token,
      name: label ?? `Zed Manual Import (${provider})`,
      isActive: true,
    });

    if (!connection) return Response.json(buildErrorBody(500, "Failed to save credential"), { status: 500 });
    return Response.json({ success: true, connectionId: connection.id, provider });
  } catch (err: unknown) {
    console.error("[Zed Manual Import] Failed to save credential:", err);
    return Response.json(buildErrorBody(500, "Failed to save credential"), { status: 500 });
  }
}
