import { z } from "zod";
import { InstallError, SERVICE_VERSION_PATTERN } from "@shiguang-gateway/core-domain/control/embedded-services-install";
import { install } from "@shiguang-gateway/core-domain/control/cliproxy";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

const bodySchema = z.object({
  version: z.string().regex(SERVICE_VERSION_PATTERN, "Invalid version: only letters, digits and . _ + - are allowed").optional().default("latest"),
});

export async function installService(request: Request): Promise<Response> {
  let body: unknown;
  try { body = request.body === null ? {} : await request.json(); }
  catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return createErrorResponse({ status: 400, message: parsed.error.message });
  try {
    return Response.json({ ok: true, ...(await install(parsed.data.version)) });
  } catch (error) {
    if (error instanceof InstallError) return createErrorResponse({ status: error.httpStatus, message: error.friendly });
    return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) });
  }
}
