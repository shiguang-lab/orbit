import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { redeemInviteCode as redeemInvite } from "@shiguang-gateway/core-domain/control/gamification";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { z } from "zod";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const schema = z.object({
    code: z.string().min(1),
    apiKeyId: z.string().min(1),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await redeemInvite(parsed.data.code, parsed.data.apiKeyId);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400, headers: CORS_HEADERS });
  }

  return Response.json(
    { success: true, serverUrl: result.serverUrl },
    { headers: CORS_HEADERS }
  );
}
