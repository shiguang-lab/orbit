import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

type CommandResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

/**
 * GET /api/usage/provider-limits
 * Returns cached Provider Limits data without triggering live refreshes.
 */
export async function GET() {
  try {
    return Response.json(await executeEdgeRuntimeCommand({ command: "provider-limits.snapshot" }));
  } catch (error) {
    console.error("[API] GET /api/usage/provider-limits error:", error);
    return Response.json({ error: "Failed to fetch cached provider limits" }, { status: 500 });
  }
}

/**
 * POST /api/usage/provider-limits
 * Manually refresh all supported Provider Limits entries.
 */
export async function POST() {
  try {
    const result = await executeEdgeRuntimeCommand<CommandResult<Record<string, unknown>>>(
      { command: "provider-limits.refresh-all" },
      { timeoutMs: 180_000 },
    );
    if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
    return Response.json(result.value);
  } catch (error) {
    console.error("[API] POST /api/usage/provider-limits error:", error);
    return Response.json({ error: "Failed to refresh provider limits" }, { status: 500 });
  }
}
