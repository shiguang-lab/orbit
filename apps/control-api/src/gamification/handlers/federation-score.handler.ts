import { CORS_HEADERS, handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { updateScore } from "@shiguang-gateway/core-domain/control/gamification";
import { getConnectedServerByKeyHash } from "@shiguang-gateway/core-domain/control/gamification-db";
import { z } from "zod";
import crypto from "crypto";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/gamification/federation/score — Receive score from connected instance
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing authorization" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const token = authHeader.slice(7);
  const tokenHash = crypto
    .pbkdf2Sync(token, "shiguangGateway-federation-salt", 120000, 32, "sha256")
    .toString("hex");
  const server = getConnectedServerByKeyHash(tokenHash);

  if (!server) {
    return Response.json(
      { error: "Invalid or unauthorized token" },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const body = await request.json();
  const schema = z.object({
    apiKeyId: z.string(),
    score: z.number(),
    scope: z.enum(["global", "weekly", "monthly"]).default("global"),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: CORS_HEADERS });
  }

  await updateScore(parsed.data.apiKeyId, parsed.data.scope, parsed.data.score);

  return Response.json({ success: true }, { headers: CORS_HEADERS });
}
