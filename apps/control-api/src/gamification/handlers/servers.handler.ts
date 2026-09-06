import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { connectServer, disconnectServer, listServers } from "@shiguang-gateway/core-domain/control/gamification";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { z } from "zod";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/gamification/servers — List connected servers
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const servers = await listServers();
  return Response.json({ servers }, { headers: CORS_HEADERS });
}

/**
 * POST /api/gamification/servers — Connect to a server
 */
export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const schema = z.object({
    name: z.string().min(1),
    url: z.string().url(),
    apiKey: z.string().min(1),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const server = await connectServer(parsed.data.name, parsed.data.url, parsed.data.apiKey);
  return Response.json({ server }, { status: 201, headers: CORS_HEADERS });
}

/**
 * DELETE /api/gamification/servers — Disconnect from a server
 */
export async function DELETE(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("id");
  if (!serverId) {
    return Response.json({ error: "id required" }, { status: 400, headers: CORS_HEADERS });
  }

  await disconnectServer(serverId);
  return Response.json({ success: true }, { headers: CORS_HEADERS });
}
