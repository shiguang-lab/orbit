import {
  AgentBridgeConfigSchema,
  exportConfig,
  importConfig,
} from "@shiguang-gateway/core-domain/control/agent-bridge";
import { failure, invalid } from "./common.js";

export async function GET(): Promise<Response> {
  try { return Response.json(exportConfig()); } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => null);
  const parsed = AgentBridgeConfigSchema.safeParse(raw);
  if (!parsed.success) return invalid("Invalid AgentBridge config", parsed.error?.issues);
  try { return Response.json({ ok: true, ...importConfig(parsed.data!) }); } catch (error) { return failure(error); }
}
