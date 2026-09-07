import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

/**
 * POST /api/providers/volcengine-plan/connect/[sessionId]/cancel
 * Cancel an auto phone login session and close its headless browser.
 */
export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
): Promise<Response> {
  const auth = await requireManagementAuth(request);
  if (auth) return auth;

  const { sessionId } = params;

  try {
    const { volcengineConsoleAutoLoginService } =
      await import("@shiguang-gateway/open-sse/services/volcengineConsoleAutoLogin");
    const session = await volcengineConsoleAutoLoginService.cancel(sessionId);
    if (!session) {
      return Response.json(
        { success: false, error: "Unknown or expired Volcano login session" },
        { status: 404 }
      );
    }
    return Response.json({ success: true, session });
  } catch {
    return Response.json({ success: false, error: "Cancel failed" }, { status: 500 });
  }
}
