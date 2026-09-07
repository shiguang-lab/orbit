import { CORS_HEADERS, handleCorsOptions } from "@orbit/core/shared/cors";
import { transferTokens, getBalance, getHistory } from "@orbit/core/control/gamification";
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

  const balance = await getBalance(apiKeyId);
  const history = await getHistory(apiKeyId);

  return Response.json({ balance, history }, { headers: CORS_HEADERS });
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
    fromApiKeyId: z.string().min(1),
    toApiKeyId: z.string().min(1),
    amount: z.number().positive(),
    reason: z.string().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await transferTokens(
    parsed.data.fromApiKeyId,
    parsed.data.toApiKeyId,
    parsed.data.amount,
    parsed.data.reason
  );

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400, headers: CORS_HEADERS });
  }

  return Response.json(
    { success: true, idempotencyKey: result.idempotencyKey },
    { headers: CORS_HEADERS }
  );
}
