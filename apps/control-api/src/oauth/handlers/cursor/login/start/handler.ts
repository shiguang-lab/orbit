// @ts-nocheck
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  createCursorLoginSession,
  generateCursorAuthParams,
} from "@shiguang-gateway/open-sse/oauth/services/cursor-login";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

async function requireOAuthAuth(request: Request) {
  if (!(await isAuthRequired(request))) return null;
  if (await isAuthenticated(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/oauth/cursor/login/start
 * Begin deep-control PKCE login. Verifier stays server-side.
 */
export async function POST(request: Request) {
  const authResponse = await requireOAuthAuth(request);
  if (authResponse) return authResponse;

  try {
    const params = await generateCursorAuthParams();
    const { sessionId, loginUrl } = createCursorLoginSession(params);
    return Response.json({
      success: true,
      sessionId,
      loginUrl,
      // Multi-replica note: sessions are in-process; use sticky routing if scaled out.
      expiresInSeconds: 15 * 60,
    });
  } catch (error) {
    const message = sanitizeErrorMessage(error) || "Failed to start Cursor login";
    return Response.json({ error: message }, { status: 500 });
  }
}
