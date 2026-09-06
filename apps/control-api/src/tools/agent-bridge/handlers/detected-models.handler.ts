import { ALL_TARGETS, globalTrafficBuffer } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { failure, notFound } from "./common.js";

const VALID_IDS = new Set(ALL_TARGETS.map((target) => target.id));

export async function GET(_request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const id = context?.params?.id ?? "";
  if (!VALID_IDS.has(id)) return notFound(`Unknown agent id: ${id}`);
  try {
    const requests = globalTrafficBuffer.list().filter((item) => item.source === "agent-bridge" && item.agent === id);
    const detectedModels = [...new Set(requests.map((item) => item.sourceModel).filter((model): model is string => typeof model === "string"))].sort();
    return Response.json({ agentId: id, detectedModels, requestCount: requests.length });
  } catch (error) { return failure(error); }
}
