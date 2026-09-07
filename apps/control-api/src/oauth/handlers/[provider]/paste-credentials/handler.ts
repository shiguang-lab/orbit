// @ts-nocheck
import { finalizeTokens } from "@shiguang-gateway/open-sse/oauth/providers";
import { persistOAuthConnection } from "@shiguang-gateway/core-domain/control/oauth-runtime/connectionPersistence";
import { parsePastedCredentials } from "../../../paste-credentials.js";
import { oauthPasteCredentialsSchema } from "@shiguang-gateway/core-domain/control/oauth-validation";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

/**
 * POST /api/oauth/[provider]/paste-credentials
 *
 * Persist credentials produced by the local remote-login helper
 * (`shiguangGateway login antigravity`). Google's `firstparty/nativeapp` consent only
 * releases the auth code when the loopback redirect is reachable, which never
 * happens on a remote VPS — so the helper runs the OAuth on the user's own
 * machine and prints a single-line credential blob. The dashboard pastes that
 * blob here; we decode + validate it (provider allowlist + match), finalize the
 * tokens (the Cloud Code onboarding runs here on the server, which CAN reach
 * Google's APIs), and persist the connection. Same finalize path as the
 * `device-complete` action. See @shiguang-gateway/auth/credential-blob.
 *
 * This lives in its own static route segment (not the dynamic `[action]` route)
 * so Next.js routes `/paste-credentials` here; static segments win over `[action]`.
 */
export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  // Creating a connection is owner-only — gate behind dashboard auth.
  if ((await isAuthRequired(request)) && !(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider } = params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateBody(oauthPasteCredentialsSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { blob, connectionId } = validation.data;

    // Decode + gate (allowlist + blob-provider must match the route provider).
    let pasted;
    try {
      pasted = parsePastedCredentials(provider, blob);
    } catch (gateErr: any) {
      return Response.json(
        { success: false, error: sanitizeErrorMessage(gateErr?.message) || "Invalid credentials" },
        { status: 400 }
      );
    }

    let tokenData: any;
    try {
      tokenData = await finalizeTokens(provider, pasted.tokens);
    } catch (finalizeErr: any) {
      return Response.json(
        {
          success: false,
          error: sanitizeErrorMessage(finalizeErr?.message) || "Failed to finalize tokens",
        },
        { status: 500 }
      );
    }

    const connection = await persistOAuthConnection(provider, tokenData, connectionId);

    return Response.json({
      success: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        email: connection.email,
        displayName: connection.displayName,
      },
    });
  } catch (error) {
    console.error("OAuth paste-credentials error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
