import { z } from "zod";
import { updateServiceField } from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

const bodySchema = z.object({ enabled: z.boolean() });

export async function toggle(request: Request, field: "autoStart" | "autoRestartAdopted" | "providerExpose"): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return createErrorResponse({ status: 400, message: parsed.error.message });
  try {
    await updateServiceField("cliproxy", field, parsed.data.enabled);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) });
  }
}
