import { AgentBridgeConfigSchema } from "../agent-bridge-portability.js";
import { exportAgentBridgeConfig, importAgentBridgeConfig } from "../agent-bridge-portability.js";
import { failure, invalid } from "./common.js";

export async function GET(): Promise<Response> {
  try { return Response.json(exportAgentBridgeConfig()); } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => null);
  const parsed = AgentBridgeConfigSchema.safeParse(raw);
  if (!parsed.success) return invalid("Invalid AgentBridge config", parsed.error?.issues);
  try { return Response.json({ ok: true, ...importAgentBridgeConfig(parsed.data!) }); } catch (error) { return failure(error); }
}
