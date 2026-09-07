import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/**
 * #10681: read the ordered per-target decision trace for one combo invocation.
 * Safe by construction: the trace holds routing metadata only (provider/model,
 * decision, allowlisted skip reason, terminal status) — never prompts, request
 * or response bodies, headers, credentials, account ids, or raw upstream
 * errors. Retention is bounded in-memory (30min TTL, 2000 invocations).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const { id } = params;
  if (!id || !id.startsWith("combo-")) {
    return Response.json({ error: "Invalid invocation id" }, { status: 400 });
  }
  const { trace } = await executeEdgeRuntimeCommand<{ trace: unknown | null }>({
    command: "combo-trace.get",
    invocationId: id,
  });
  if (!trace) {
    return Response.json({ error: "Combo trace not found or expired" }, { status: 404 });
  }
  return Response.json(trace);
}
