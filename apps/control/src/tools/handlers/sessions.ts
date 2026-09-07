import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { InspectorSessionStartSchema } from "@orbit/core/control/traffic-inspector";
import { inspectorSessionsRepository } from "../traffic-inspector/inspector-sessions.repository.js";

export async function listRecordingSessions(): Promise<Response> {
  try {
    return Response.json({ sessions: inspectorSessionsRepository.list() });
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    return new Response(JSON.stringify(buildErrorBody(500, msg || "Failed to list sessions")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function createRecordingSession(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const parsed = InspectorSessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(buildErrorBody(400, parsed.error.issues[0]?.message ?? "Validation error")), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    return Response.json(inspectorSessionsRepository.create({ name: parsed.data.name }), { status: 201 });
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    return new Response(JSON.stringify(buildErrorBody(500, msg || "Failed to create session")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
