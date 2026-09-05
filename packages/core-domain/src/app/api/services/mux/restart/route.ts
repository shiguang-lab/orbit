import { getServiceRow } from "../../../../../lib/db/versionManager.ts";
import { getOrInitSupervisor } from "../_lib";
import { createErrorResponse } from "../../../../../lib/api/errorResponse.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";

const TOOL = "mux";

export async function POST(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") {
      return createErrorResponse({ status: 409, message: "Mux não está instalado." });
    }

    const sup = await getOrInitSupervisor();
    const status = await sup.restart();
    return Response.json(status);
  } catch (err) {
    const msg = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return createErrorResponse({ status: 503, message: msg });
  }
}
