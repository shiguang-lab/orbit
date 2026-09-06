import {
  AgentBridgeMappingPutSchema,
} from "@shiguang-gateway/core-domain/control/agent-bridge";
import { agentBridgePersistence } from "../agent-bridge.persistence.js";
import { failure, invalid } from "./common.js";

export async function GET(_request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  try { return Response.json({ mappings: agentBridgePersistence.getMappingsForAgent(context?.params?.id ?? "") }); } catch (error) { return failure(error); }
}

export async function PUT(request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const parsed = AgentBridgeMappingPutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid("Invalid request body", parsed.error?.flatten?.());
  try {
    const id = context?.params?.id ?? "";
    agentBridgePersistence.setMappings(id, parsed.data!.mappings);
    agentBridgePersistence.syncAgentBridgeMappingsToMitmAlias(id);
    return Response.json({ ok: true, mappings: agentBridgePersistence.getMappingsForAgent(id) });
  } catch (error) { return failure(error); }
}
