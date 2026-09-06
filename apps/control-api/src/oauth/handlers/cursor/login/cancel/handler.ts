// @ts-nocheck
import { z } from "zod";
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { cancelCursorLoginSession } from "@shiguang-gateway/open-sse/oauth/services/cursor-login";

const cancelSchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
});

async function requireOAuthAuth(request: Request) {
  if (!(await isAuthRequired(request))) return null;
  if (await isAuthenticated(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/oauth/cursor/login/cancel
 * Drop an in-progress deep-control login session.
 */
export async function POST(request: Request) {
  const authResponse = await requireOAuthAuth(request);
  if (authResponse) return authResponse;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  const validation = validateBody(cancelSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const cancelled = cancelCursorLoginSession(validation.data.sessionId);
  return Response.json({ success: true, cancelled });
}
