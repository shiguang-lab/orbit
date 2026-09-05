/**
 * GET /api/tools/agent-bridge/agents
 * Returns the full list of registered MITM targets mapped to a stable UI shape.
 * LOCAL_ONLY: registered in routeGuard.ts
 */
import { ALL_TARGETS } from "../../../../../mitm/targets/index.ts";
import { detectAgent } from "../../../../../mitm/detection/index.ts";
import { sanitizeErrorMessage } from "../../../../../../../open-sse/utils/error.ts";
import { createErrorResponse } from "../../../../../lib/api/errorResponse.ts";

export async function GET(): Promise<Response> {
  try {
    const agents = ALL_TARGETS.map((t) => ({
      id: t.id,
      name: t.name,
      hosts: t.hosts,
      viability: t.viability ?? "supported",
      state: detectAgent(t.id),
    }));
    return Response.json({ agents });
  } catch (err) {
    const msg = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return createErrorResponse({ status: 500, message: msg });
  }
}
