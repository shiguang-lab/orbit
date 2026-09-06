import {
  ALL_TARGETS,
  detectAgent,
} from "@shiguang-gateway/core-domain/control/agent-bridge";
import { agentBridgePersistence } from "../agent-bridge.persistence.js";
import { failure, invalid, notFound } from "./common.js";

const VALID_IDS = new Set(ALL_TARGETS.map((target) => target.id));

export async function list(): Promise<Response> {
  try {
    return Response.json({
      agents: ALL_TARGETS.map((target) => ({
        id: target.id,
        name: target.name,
        hosts: target.hosts,
        viability: target.viability ?? "supported",
        state: detectAgent(target.id),
      })),
    });
  } catch (error) { return failure(error); }
}

export async function detail(request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const id = context?.params?.id ?? "";
  try {
    // Agent detail uses the stable registry id, whereas resolveTarget() is
    // intentionally hostname-oriented for MITM connection routing.
    const target = ALL_TARGETS.find((candidate) => candidate.id === id);
    if (!target) return notFound(`Agent not found: ${id}`);
    return Response.json({ agent: target, detection: detectAgent(id), state: agentBridgePersistence.getAgentBridgeState(id) ?? null });
  } catch (error) { return failure(error); }
}

export async function patch(request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const id = context?.params?.id ?? "";
  if (!VALID_IDS.has(id)) return invalid(`Unknown agent id: ${id}`);
  const body = await request.json().catch(() => null) as { setup_completed?: unknown } | null;
  if (typeof body?.setup_completed !== "boolean") return invalid("Invalid request body");
  try {
    agentBridgePersistence.upsertAgentBridgeState({ agent_id: id, setup_completed: body.setup_completed });
    return Response.json({ ok: true, state: agentBridgePersistence.getAgentBridgeState(id) });
  } catch (error) { return failure(error); }
}
