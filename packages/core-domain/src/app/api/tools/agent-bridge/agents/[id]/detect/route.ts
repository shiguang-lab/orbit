/**
 * GET /api/tools/agent-bridge/agents/[id]/detect
 * Run detection probe for an agent and return { installed, version?, path? }.
 * LOCAL_ONLY: registered in routeGuard.ts
 */
import { detectAgent } from "../../../../../../../mitm/detection/index.ts";
import type { AgentId } from "../../../../../../../mitm/types.ts";
import { sanitizeErrorMessage } from "../../../../../../../../../open-sse/utils/error.ts";
import { createErrorResponse } from "../../../../../../../lib/api/errorResponse.ts";

const VALID_IDS = new Set<AgentId>([
  "antigravity",
  "kiro",
  "copilot",
  "codex",
  "cursor",
  "zed",
  "claude-code",
  "open-code",
  "trae",
]);

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = params;

  if (!VALID_IDS.has(id as AgentId)) {
    return createErrorResponse({ status: 404, message: `Unknown agent id: ${id}` });
  }

  try {
    const result = detectAgent(id as AgentId);
    return Response.json({ agentId: id, ...result });
  } catch (err) {
    const msg = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return createErrorResponse({ status: 500, message: msg });
  }
}
