import { updateServiceField } from "@orbit/core/control/embedded-services-lifecycle";
import { createErrorResponse } from "@orbit/utils/errors/api-response";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { z } from "zod";

const bodySchema = z.object({ enabled: z.boolean() });

export async function toggle(request: Request, field: "autoStart" | "autoRestartAdopted"): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return createErrorResponse({ status: 400, message: parsed.error.message });
  try {
    await updateServiceField("mux", field, parsed.data.enabled);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) });
  }
}
