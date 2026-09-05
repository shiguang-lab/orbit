import { getSupervisor } from "../../../../../lib/services/registry.ts";
import { createErrorResponse } from "../../../../../lib/api/errorResponse.ts";
import { sanitizeErrorMessage } from "../../../../../../../open-sse/utils/error.ts";

const TOOL = "mux";

export async function POST(): Promise<Response> {
  try {
    const sup = getSupervisor(TOOL);
    if (!sup) {
      return Response.json({ tool: TOOL, state: "stopped" });
    }
    const status = await sup.stop();
    return Response.json(status);
  } catch (err) {
    const msg = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return createErrorResponse({ status: 500, message: msg });
  }
}
