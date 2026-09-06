// @ts-nocheck
import { z } from "zod";
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  credentialsFromCursorTokens,
  peekCursorLoginSession,
  pollCursorAuthOnce,
  consumeCursorLoginSession,
} from "@shiguang-gateway/open-sse/oauth/services/cursor-login";
import { persistCursorConnection } from "@shiguang-gateway/core-domain/control/oauth-runtime/services/persistCursorConnection";
import { isCloudEnabled } from "@shiguang-gateway/core-domain/control/models";
import { syncToCloud } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";

const pollSchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
});

async function requireOAuthAuth(request: Request) {
  if (!(await isAuthRequired(request))) return null;
  if (await isAuthenticated(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

async function syncToCloudIfEnabled() {
  try {
    if (await isCloudEnabled()) {
      await syncToCloud();
    }
  } catch {
    // best-effort
  }
}

/**
 * POST /api/oauth/cursor/login/poll
 * One poll against Cursor auth/poll. UI repeats until ok/error/timeout.
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

  const validation = validateBody(pollSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { sessionId } = validation.data;
  const session = peekCursorLoginSession(sessionId);
  if (!session) {
    return Response.json(
      { status: "expired", error: "Login session expired or not found. Start again." },
      { status: 410 }
    );
  }

  try {
    const result = await pollCursorAuthOnce(session.uuid, session.verifier);
    if (result.status === "pending") {
      return Response.json({ status: "pending" });
    }
    if (result.status === "error") {
      return Response.json(
        { status: "error", error: result.message },
        { status: result.httpStatus && result.httpStatus >= 400 ? result.httpStatus : 502 }
      );
    }

    // Success — consume session so verifier cannot be reused
    consumeCursorLoginSession(sessionId);

    const creds = credentialsFromCursorTokens(result.accessToken, result.refreshToken);
    const machineId = await getConsistentMachineId();
    const connection = await persistCursorConnection({
      ...creds,
      machineId,
      authMethod: "deep_control",
    });

    await syncToCloudIfEnabled();

    return Response.json({
      status: "ok",
      success: true,
      connection: {
        id: (connection as { id?: string })?.id,
        provider: "cursor",
        email: (connection as { email?: string })?.email ?? creds.email ?? null,
      },
    });
  } catch (error) {
    const message = sanitizeErrorMessage(error) || "Failed to poll Cursor login";
    return Response.json({ error: message }, { status: 500 });
  }
}
