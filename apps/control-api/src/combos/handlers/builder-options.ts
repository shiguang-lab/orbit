import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getComboBuilderOptions } from "../builder-options.js";

/** GET /api/combos/builder/options. Control-plane picker metadata. */
export async function getBuilderOptions(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    return Response.json(await getComboBuilderOptions());
  } catch (error) {
    console.error("Error fetching combo builder options:", error);
    return Response.json({ error: "Failed to fetch combo builder options" }, { status: 500 });
  }
}
