import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

function serverErrorResponse(error: unknown): Response {
  return Response.json(
    {
      error: {
        message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        type: "server_error",
      },
    },
    { status: 500 }
  );
}

/**
 * GET /api/usage/proxy-logs — get proxy usage logs
 * Query params: ?status=ok|error|timeout&type=http|socks5&provider=xxx&level=global|provider|combo|key&search=xxx&limit=300
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: Record<string, string | number> = {};
    for (const key of ["status", "type", "provider", "level", "search"] as const) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (Number.isFinite(limit) && limit > 0) filters.limit = limit;
    }

    const { logs } = await executeEdgeRuntimeCommand<{ logs: unknown[] }>({
      command: "proxy-logs.list",
      filters,
    });
    return Response.json(logs);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

/**
 * DELETE /api/usage/proxy-logs — clear all proxy logs
 */
export async function DELETE() {
  try {
    return Response.json(await executeEdgeRuntimeCommand({ command: "proxy-logs.clear" }));
  } catch (error) {
    return serverErrorResponse(error);
  }
}
