import {
  admitChatRequest,
  CHAT_ADMISSION_QUEUE_MAX_MS,
  releaseChatAdmissionAfterHandler,
  resolveSessionId,
  type ChatAdmissionController,
} from "@shiguang-gateway/core-domain/shared/middleware/chatBodyAdmission";

type RouteHandler = (request: Request, ...args: any[]) => Promise<Response> | Response;
type AdmittedRouteHandler = (request: Request, ...args: any[]) => Promise<Response>;

/** Apply the shared process-local admission controller to an edge route handler. */
export function withChatAdmission(
  handler: RouteHandler,
  options: {
    controller?: ChatAdmissionController;
    queueMs?: number;
    largeBodyBytes?: number;
    hardMaxBytes?: number;
  } = {},
): AdmittedRouteHandler {
  return async function admittedHandler(request: Request, ...args: any[]) {
    const admission = await admitChatRequest(request, {
      sessionId: resolveSessionId(request),
      queueMs: options.queueMs ?? CHAT_ADMISSION_QUEUE_MAX_MS,
      controller: options.controller,
      largeBodyBytes: options.largeBodyBytes,
      hardMaxBytes: options.hardMaxBytes,
    });
    if (admission.admit === false) return admission.response;
    try {
      return await releaseChatAdmissionAfterHandler(
        Promise.resolve(handler(admission.request, ...args)),
        admission.lease,
      );
    } catch (error) {
      admission.lease?.release();
      throw error;
    }
  };
}
