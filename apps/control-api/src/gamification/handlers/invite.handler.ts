import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import { createInvite, listInvites, revokeInvite } from "@orbit/core/control/gamification";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { z } from "zod";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const apiKeyId = url.searchParams.get("apiKeyId");
  if (!apiKeyId) {
    return Response.json(
      { error: "apiKeyId required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const invites = await listInvites(apiKeyId);
  return Response.json({ invites }, { headers: CORS_HEADERS });
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
    apiKeyId: z.string().min(1),
    serverUrl: z.string().optional(),
    maxUses: z.number().positive().default(1),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { code, token } = await createInvite(
    parsed.data.apiKeyId,
    parsed.data.serverUrl,
    parsed.data.maxUses
  );

  return Response.json({ code, token }, { status: 201, headers: CORS_HEADERS });
}

export async function DELETE(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const inviteId = url.searchParams.get("id");
  if (!inviteId) {
    return Response.json({ error: "id required" }, { status: 400, headers: CORS_HEADERS });
  }

  await revokeInvite(inviteId);
  return Response.json({ success: true }, { headers: CORS_HEADERS });
}
