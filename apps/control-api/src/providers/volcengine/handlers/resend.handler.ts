import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

/**
 * POST /api/providers/volcengine-plan/connect/[sessionId]/resend
 * Re-trigger the SMS verification code for an active login session.
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
    const session = await volcengineConsoleAutoLoginService.resendCode(sessionId);
    if (!session) {
      return Response.json(
        { success: false, error: "Unknown or expired Volcano login session" },
        { status: 404 }
      );
    }
    return Response.json({ success: true, session });
  } catch {
    return Response.json({ success: false, error: "Resend failed" }, { status: 500 });
  }
}
