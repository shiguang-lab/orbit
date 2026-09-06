import {
  getSession,
  harvestSession,
  listSessions,
  markViewerActive,
  startSession,
  stopSession,
  type VncSession,
} from "./service.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

export type VncOperationResult =
  | { value: unknown; error?: never }
  | { error: { status: number; message: string }; value?: never };

export function publicVncSession(session: VncSession | undefined | null) {
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    connectionId: session.connectionId,
    providerId: session.providerId,
    url: session.url,
    status: session.status,
    startedAt: session.startedAt,
    lastViewerAt: session.lastViewerAt,
    lastHarvestAt: session.lastHarvestAt,
    viewer:
      session.vncPort > 0
        ? {
            localUrl: `http://127.0.0.1:${session.vncPort}/`,
            loopbackOnly: true,
          }
        : null,
  };
}

export function vncErrorResponse(status: number, error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return { error: { status, message: sanitizeErrorMessage(raw) } } satisfies VncOperationResult;
}

/**
 * Connection-scoped browser-login control.
 *
 * GET    /api/vnc-session/:connectionId                 list sessions for connection
 * GET    /api/vnc-session/:connectionId/:sessionId      session state
 * POST   /api/vnc-session/:connectionId/start           start a browser session
 * POST   /api/vnc-session/:connectionId/:sessionId/harvest
 * POST   /api/vnc-session/:connectionId/:sessionId/touch
 * DELETE /api/vnc-session/:connectionId/:sessionId      stop and remove session
 *
 * noVNC and CDP are published on random 127.0.0.1-only host ports. Until an
 * authenticated same-origin websocket proxy is added, remote operators must use
 * an SSH tunnel to the returned viewer.localUrl port.
 */
export async function getVncSession(connectionId: string, sessionId?: string) {
  if (!connectionId) return vncErrorResponse(400, "connectionId is required");

  if (!sessionId) {
    return { value: { sessions: listSessions(connectionId).map(publicVncSession) } } satisfies VncOperationResult;
  }

  const session = getSession(connectionId, sessionId);
  if (!session) return vncErrorResponse(404, "Browser-login session not found");
  return { value: { session: publicVncSession(session) } } satisfies VncOperationResult;
}

export async function postVncSession(connectionId: string, second?: string, action?: string) {
  if (!connectionId) return vncErrorResponse(400, "connectionId is required");

  try {
    if (second === "start" && !action) {
      const session = await startSession(connectionId);
      return { value: {
        session: publicVncSession(session),
        note:
          "The viewer is loopback-only. Open it on the ShiguangGateway host or forward its port over SSH, then harvest the session.",
      } };
    }

    if (!second || !action) return vncErrorResponse(400, "sessionId and action are required");

    if (action === "harvest") {
      const result = await harvestSession(connectionId, second);
      return { value: {
        ...result,
        validation: result.validation
          ? {
              ...result.validation,
              error: result.validation.error
                ? sanitizeErrorMessage(result.validation.error)
                : null,
            }
          : null,
      } };
    }
    if (action === "touch") {
      if (!getSession(connectionId, second)) {
        return vncErrorResponse(404, "Browser-login session not found");
      }
      markViewerActive(connectionId, second);
      return { value: { ok: true, sessionId: second, connectionId } };
    }

    return vncErrorResponse(400, `Unknown browser-login action: ${action}`);
  } catch (error) {
    return vncErrorResponse(500, error);
  }
}

export async function deleteVncSession(connectionId?: string, sessionId?: string) {
  if (!connectionId || !sessionId) {
    return vncErrorResponse(400, "connectionId and sessionId are required");
  }

  try {
    await stopSession(connectionId, sessionId);
    return { value: { stopped: true, connectionId, sessionId } };
  } catch (error) {
    return vncErrorResponse(500, error);
  }
}
