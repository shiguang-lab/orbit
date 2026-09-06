import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { bindVolcenginePlansFromConsoleCredentials } from "../volcengine-plan.binding.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

/**
 * GET /api/providers/volcengine-plan/connect/[sessionId]/status
 * Poll an auto phone login session. When credentials have been extracted, the
 * plan binding runs lazily (deduped) and its result is attached to the view.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  const auth = await requireManagementAuth(request);
  if (auth) return auth;

  const { sessionId } = await params;

  try {
    const { volcengineConsoleAutoLoginService } =
      await import("@shiguang-gateway/open-sse/services/volcengineConsoleAutoLogin");

    const session = await volcengineConsoleAutoLoginService.withBinding(sessionId, (credentials) =>
      bindVolcenginePlansFromConsoleCredentials(credentials)
    );

    if (!session) {
      return Response.json(
        { success: false, error: "Unknown or expired Volcano login session" },
        { status: 404 }
      );
    }

    return Response.json({ success: session.phase === "success", session });
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: `Volcano login status failed: ${message}` },
      { status: 500 }
    );
  }
}
