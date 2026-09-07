import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { bindVolcenginePlansFromConsoleCredentials } from "../volcengine-plan.binding.js";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { formatValidationMessage, validateBody } from "@orbit/core/shared/validation/helpers";
import { volcenginePlanConnectSchema } from "@orbit/core/control/volcengine-validation";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireManagementAuth(request);
  if (auth) return auth;

  const raw = await request.json().catch(() => ({}));
  const validation = validateBody(volcenginePlanConnectSchema, raw);
  if (!validation.success) {
    return Response.json(
      { success: false, error: formatValidationMessage(validation.error) },
      { status: 400 }
    );
  }
  const { phone, timeout } = validation.data;

  // Auto flow: phone present → start a session-based headless phone/SMS login.
  if (phone) {
    try {
      const { volcengineConsoleAutoLoginService } = await import(
        "@orbit/inference/services/volcengineConsoleAutoLogin"
      );
      const started = await volcengineConsoleAutoLoginService.startLogin(phone, { timeout });
      if (!started.ok) {
        return Response.json({ success: false, error: started.error }, { status: 400 });
      }
      return Response.json({ success: true, session: started.session });
    } catch (error) {
      const message = sanitizeErrorMessage(error instanceof Error ? error.message : error);
      return Response.json(
        { success: false, error: `Volcano auto login failed to start: ${message}` },
        { status: 500 }
      );
    }
  }

  // Legacy manual flow: headful browser login on the server machine.
  try {
    const { inAppLoginService } = await import("@orbit/inference/services/inAppLoginService");
    const login = await inAppLoginService.startLogin("volcengine-console", { timeout });
    if (!login.success || !login.credentials) {
      return Response.json(
        { success: false, error: login.error || "Volcano console login failed" },
        { status: 400 }
      );
    }

    const binding = await bindVolcenginePlansFromConsoleCredentials(login.credentials);
    return Response.json({ success: true, binding });
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: `Volcano account binding failed: ${message}` },
      { status: 500 }
    );
  }
}
