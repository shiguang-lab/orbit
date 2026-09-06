import { AgentBridgeDnsActionSchema, ALL_TARGETS, addDNSEntry, getCachedPassword, getAgentBridgeStore, isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, removeDNSEntry, resolveMitmSudoPassword, setCachedPassword } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { invalid } from "./common.js";

export async function POST(request: Request, context?: { params: Record<string, string> }): Promise<Response> {
  const id = context?.params?.id ?? "";
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const parsed = AgentBridgeDnsActionSchema.safeParse(body);
  if (!parsed.success) return invalid("Invalid request body", parsed.error.flatten());
  if (!ALL_TARGETS.some((target) => target.id === id)) return errorResponse(404, `Unknown agent: ${id}`);
  const raw = body as Record<string, unknown>;
  const supplied = typeof raw.sudoPassword === "string" ? raw.sudoPassword : undefined;
  const password = resolveMitmSudoPassword(supplied, getCachedPassword());
  if (isMitmSudoPasswordRequired(password)) return errorResponse(400, "Missing sudoPassword");
  try {
    if (parsed.data.enabled) await addDNSEntry(password, id);
    else await removeDNSEntry(password, id);
    const normalized = normalizeMitmSudoPasswordInput(supplied);
    if (process.platform !== "win32" && normalized) setCachedPassword(normalized);
    getAgentBridgeStore().upsertAgentBridgeState({ agent_id: id, dns_enabled: parsed.data.enabled });
    return Response.json({ ok: true, dns_enabled: parsed.data.enabled });
  } catch (error) {
    return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error)));
  }
}
