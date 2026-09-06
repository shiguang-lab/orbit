import { Injectable } from "@nestjs/common";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { getVncSessionCatalog } from "@shiguang-gateway/core-domain/edge/vnc-session";
import {
  deleteVncSession,
  getVncSession,
  postVncSession,
} from "@shiguang-gateway/core-domain/edge/vnc-session-params";

function resultResponse(result: { value?: unknown; error?: { status: number; message: string } }): Response {
  if (result.error) return Response.json(buildErrorBody(result.error.status, result.error.message), { status: result.error.status });
  return Response.json(result.value);
}

@Injectable()
export class VncSessionService {
  handleCatalog(): Response { return Response.json(getVncSessionCatalog()); }
  async handleGet(connectionId: string, sessionId?: string): Promise<Response> {
    return resultResponse(await getVncSession(connectionId, sessionId));
  }
  async handlePost(connectionId: string, sessionId?: string, action?: string): Promise<Response> {
    return resultResponse(await postVncSession(connectionId, sessionId, action));
  }
  async handleDelete(connectionId?: string, sessionId?: string): Promise<Response> {
    return resultResponse(await deleteVncSession(connectionId, sessionId));
  }
}
