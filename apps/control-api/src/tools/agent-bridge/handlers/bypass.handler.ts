import {
  AgentBridgeBypassUpsertSchema,
} from "@shiguang-gateway/core-domain/control/agent-bridge";
import { agentBridgePersistence } from "../agent-bridge.persistence.js";
import { failure, invalid } from "./common.js";

export async function GET(): Promise<Response> {
  try { return Response.json({ patterns: agentBridgePersistence.getAllBypassPatterns() }); } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = AgentBridgeBypassUpsertSchema.safeParse(body);
  if (!parsed.success) return invalid("Invalid request body", parsed.error?.flatten?.());
  try {
    agentBridgePersistence.replaceUserBypassPatterns(parsed.data!.patterns);
    return Response.json({ ok: true, patterns: agentBridgePersistence.getAllBypassPatterns() });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  const pattern = new URL(request.url).searchParams.get("pattern");
  if (!pattern) return invalid("Missing query param: pattern");
  try {
    agentBridgePersistence.replaceUserBypassPatterns(agentBridgePersistence.getUserBypassPatterns().filter((item) => item !== pattern));
    return Response.json({ ok: true, patterns: agentBridgePersistence.getAllBypassPatterns() });
  } catch (error) { return failure(error); }
}
