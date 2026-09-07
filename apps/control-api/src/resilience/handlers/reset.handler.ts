import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

/**
 * POST /api/resilience/reset — Reset all provider circuit breakers and model lockouts.
 *
 * Requires management auth: flushing every breaker + model lockout disrupts
 * routing for all traffic, so it must not be reachable unauthenticated.
 */
export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { resetCount } = await executeEdgeRuntimeCommand<{ resetCount: number }>({
      command: "resilience.reset",
    });

    return Response.json({
      ok: true,
      resetCount,
      message: `Reset ${resetCount} circuit breaker(s) and model lockouts`,
    });
  } catch (err: unknown) {
    console.error("[API] POST /api/resilience/reset error:", err);
    return Response.json({ error: "Failed to reset resilience state" }, { status: 500 });
  }
}
