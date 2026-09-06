import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { getVncSessionCatalog } from "./runtime/catalog.js";
import {
  deleteVncSession,
  getVncSession,
  postVncSession,
} from "./runtime/operations.js";
import { stopAllSessions } from "./runtime/service.js";

function resultResponse(result: { value?: unknown; error?: { status: number; message: string } }): Response {
  if (result.error) return Response.json(buildErrorBody(result.error.status, result.error.message), { status: result.error.status });
  return Response.json(result.value);
}

@Injectable()
export class VncSessionService implements OnApplicationShutdown {
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

  async onApplicationShutdown(): Promise<void> {
    await stopAllSessions();
  }
}
