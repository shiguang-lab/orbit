import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { bindVolcenginePlansFromConsoleCredentials } from "../volcengine-plan.binding.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { formatValidationMessage, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { volcenginePlanIdentitySchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";

/**
 * POST /api/providers/volcengine-plan/connect/[sessionId]/identity
 * Pick an identity on the console's select_identity page (the phone maps to
 * multiple accounts) and finish the login + plan binding.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  const auth = await requireManagementAuth(request);
  if (auth) return auth;

  const { sessionId } = await params;
  const raw = await request.json().catch(() => ({}));
  // Validate BEFORE the session lookup — see the sibling code/route.ts note.
  const validation = validateBody(volcenginePlanIdentitySchema, raw);
  if (!validation.success) {
    return Response.json(
      { success: false, error: formatValidationMessage(validation.error) },
      { status: 400 }
    );
  }
  const { index, timeout } = validation.data;

  try {
    const { volcengineConsoleAutoLoginService } = await import(
      "@shiguang-gateway/open-sse/services/volcengineConsoleAutoLogin"
    );

    if (!volcengineConsoleAutoLoginService.getStatus(sessionId)) {
      return Response.json(
        { success: false, error: "Unknown or expired Volcano login session" },
        { status: 404 }
      );
    }

    const session = await volcengineConsoleAutoLoginService.selectIdentity(sessionId, index, {
      timeout,
    });
    if (!session) {
      return Response.json(
        { success: false, error: "Unknown or expired Volcano login session" },
        { status: 404 }
      );
    }

    // Credentials ready → bind immediately so the response carries the outcome.
    if (session.phase === "success") {
      const bound = await volcengineConsoleAutoLoginService.withBinding(sessionId, (credentials) =>
        bindVolcenginePlansFromConsoleCredentials(credentials)
      );
      return Response.json({ success: true, session: bound ?? session });
    }

    return Response.json({ success: false, session });
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: `Volcano identity selection failed: ${message}` },
      { status: 500 }
    );
  }
}
