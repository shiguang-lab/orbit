import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/** GET /api/combos/auto. Enumerate supported virtual auto-combo templates. */
export async function listAutoCombos(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    return Response.json(await executeEdgeRuntimeCommand({ command: "auto-combos.snapshot" }));
  } catch (error) {
    console.error("Error fetching auto combos:", error);
    return Response.json({ combos: [] });
  }
}
