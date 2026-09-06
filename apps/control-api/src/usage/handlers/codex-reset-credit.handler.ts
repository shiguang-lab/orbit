import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

type CommandResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

const connectionId = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 && trimmed.length <= 256 ? trimmed : null;
};

const errorResponse = (error: unknown) => {
  const value = error as { status?: unknown; code?: unknown; message?: unknown };
  const status = typeof value?.status === "number" ? value.status : 500;
  const code = typeof value?.code === "string" ? value.code : "codex_reset_credit_failed";
  return Response.json(
    { ok: false, code, error: typeof value?.message === "string" && value.message ? value.message : "Codex reset-credit request failed." },
    { status },
  );
};

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const id = connectionId(new URL(request.url).searchParams.get("connectionId"));
  if (!id) return Response.json({ ok: false, code: "invalid_connection_id", error: "Invalid connectionId." }, { status: 400 });
  try {
    const result = await executeEdgeRuntimeCommand<CommandResult<Record<string, unknown>>>(
      { command: "codex-reset-credits.list", connectionId: id },
      { timeoutMs: 180_000 },
    );
    if (!result.ok) return errorResponse(result);
    return Response.json({ ok: true, ...result.value });
  } catch (error) {
    console.error("[API] GET /api/usage/codex-reset-credit error:", error);
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  if (!body || typeof body !== "object") return Response.json({ ok: false, code: "invalid_request_body", error: "Invalid request body." }, { status: 400 });
  const raw = body as Record<string, unknown>;
  const id = connectionId(typeof raw.connectionId === "string" ? raw.connectionId : null);
  const key = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : "";
  const creditId = typeof raw.creditId === "string" && raw.creditId.trim() ? raw.creditId.trim() : undefined;
  if (!id || !key || key.length > 256 || (creditId && creditId.length > 512)) {
    return Response.json({ ok: false, code: "invalid_request_body", error: "Invalid request body." }, { status: 400 });
  }
  try {
    const result = await executeEdgeRuntimeCommand<CommandResult<Record<string, unknown>>>(
      {
        command: "codex-reset-credits.consume",
        connectionId: id,
        idempotencyKey: key,
        ...(creditId ? { creditId } : {}),
      },
      { timeoutMs: 180_000 },
    );
    if (!result.ok) return errorResponse(result);
    return Response.json({ ok: true, ...result.value });
  } catch (error) {
    console.error("[API] POST /api/usage/codex-reset-credit error:", error);
    return errorResponse(error);
  }
}
