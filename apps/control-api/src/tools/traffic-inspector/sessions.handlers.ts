import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { InspectorSessionPatchSchema, InspectorSessionRequestAppendSchema } from "@orbit/core/control/traffic-inspector";
import { toHar } from "@orbit/core/control/traffic-inspector";
import { inspectorSessionsRepository } from "./inspector-sessions.repository.js";

const jsonError = (status: number, message: string): Response =>
  new Response(JSON.stringify(buildErrorBody(status, message)), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function getSession(id: string): Promise<Response> {
  try {
    const session = inspectorSessionsRepository.get(id);
    if (!session) return jsonError(404, "Session not found");
    const requests = inspectorSessionsRepository.getRequests(id).map((row) => {
      try { return JSON.parse(row.payload) as unknown; } catch { return row.payload; }
    });
    return Response.json({ session, requests });
  } catch (error) {
    return jsonError(500, sanitizeErrorMessage(error) || "Failed to get session");
  }
}

export async function patchSession(request: Request, id: string): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorSessionPatchSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");

  if (!inspectorSessionsRepository.get(id)) return jsonError(404, "Session not found");
  try {
    if (parsed.data.action === "stop") inspectorSessionsRepository.stop(id);
    else {
      if (!parsed.data.name) return jsonError(400, "name is required for rename action");
      inspectorSessionsRepository.rename(id, parsed.data.name);
    }
    return Response.json(inspectorSessionsRepository.get(id));
  } catch (error) {
    return jsonError(500, sanitizeErrorMessage(error) || "Failed to update session");
  }
}

export async function deleteSession(id: string): Promise<Response> {
  if (!inspectorSessionsRepository.get(id)) return jsonError(404, "Session not found");
  try {
    inspectorSessionsRepository.delete(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(500, sanitizeErrorMessage(error) || "Failed to delete session");
  }
}

export async function appendSessionRequest(request: Request, id: string): Promise<Response> {
  if (!inspectorSessionsRepository.get(id)) return jsonError(404, "Session not found");
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorSessionRequestAppendSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  try {
    return Response.json({ seq: inspectorSessionsRepository.appendRequest(id, parsed.data.payload) }, { status: 201 });
  } catch (error) {
    return jsonError(500, sanitizeErrorMessage(error) || "Failed to append session request");
  }
}

export async function exportSessionHar(id: string): Promise<Response> {
  const session = inspectorSessionsRepository.get(id);
  if (!session) return jsonError(404, "Session not found");
  try {
    const requests = inspectorSessionsRepository.getRequests(id)
      .map((row) => { try { return JSON.parse(row.payload) as never; } catch { return null; } })
      .filter((row): row is never => row !== null);
    const har = toHar(requests);
    const sessionName = (session.name ?? `session-${id}`).replace(/[^a-z0-9_-]/gi, "_");
    return new Response(JSON.stringify(har, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${sessionName}.har"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(500, sanitizeErrorMessage(error) || "HAR export failed");
  }
}
