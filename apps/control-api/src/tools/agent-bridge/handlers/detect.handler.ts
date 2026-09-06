import { ALL_TARGETS, detectAgent } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { failure, notFound } from "./common.js";

const VALID_IDS = new Set(ALL_TARGETS.map((target) => target.id));

export async function GET(_request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const id = context?.params?.id ?? "";
  if (!VALID_IDS.has(id)) return notFound(`Unknown agent id: ${id}`);
  try { return Response.json({ agentId: id, ...detectAgent(id) }); } catch (error) { return failure(error); }
}
