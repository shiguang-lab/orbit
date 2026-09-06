import { z } from "zod";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { handleChat } from "@shiguang-gateway/core-domain/edge/chat-handler";
import {
  admitChatRequest,
  admitChatStructure,
  CHAT_ADMISSION_QUEUE_MAX_MS,
  getComboForModel,
  getModelInfo,
  releaseChatAdmissionAfterHandler,
  releaseChatAdmissionWhenDone,
  resolveResponsesApiModel,
  resolveSessionId,
} from "@shiguang-gateway/core-domain/edge/responses-runtime";
import { createInjectionGuard } from "@shiguang-gateway/core-domain/middleware/prompt-injection";
import { generateRequestId } from "@shiguang-gateway/core-domain/edge/request-id";
import { errorResponse } from "@shiguang-gateway/open-sse/utils/error";
import { SSE_HEARTBEAT_INTERVAL_MS } from "@shiguang-gateway/open-sse/config/constants";
import { resolveStreamFlag } from "@shiguang-gateway/open-sse/utils/aiSdkCompat";
import {
  OPENAI_RESPONSES_ERROR_FRAME,
  withEarlyStreamKeepalive,
} from "@shiguang-gateway/open-sse/utils/earlyStreamKeepalive";
import { OPENAI_RESPONSES_IN_PROGRESS_FRAME } from "@shiguang-gateway/open-sse/utils/sseHeartbeat";
import { resolveKeepaliveThreshold } from "@shiguang-gateway/open-sse/utils/keepaliveThreshold";

const injectionGuard = createInjectionGuard();

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function withCodexPreferredModel(
  request: Request,
  preParsedBody: any = null,
): Promise<{ request: Request; body: any }> {
  try {
    const body = preParsedBody ?? (await request.clone().json().catch(() => null));
    if (!body || typeof body !== "object" || typeof body.model !== "string") {
      return { request, body };
    }
    const { model, changed } = await resolveResponsesApiModel(
      body.model,
      getModelInfo as any,
      async (name) => !!(await getComboForModel(name)),
    );
    if (!changed) return { request, body };
    const rewrittenBody = { ...body, model };
    return {
      request: new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(rewrittenBody),
        signal: request.signal,
      }),
      body: rewrittenBody,
    };
  } catch {
    return { request, body: preParsedBody };
  }
}

async function postHandler(request: Request): Promise<Response> {
  const sessionId = resolveSessionId(request);
  const admissionResult = await admitChatRequest(request, {
    sessionId,
    queueMs: CHAT_ADMISSION_QUEUE_MAX_MS,
  });
  if (admissionResult.admit === false) return admissionResult.response;

  request = admissionResult.request;
  const admission = admissionResult;
  const finishAdmission = (response: Response) =>
    releaseChatAdmissionWhenDone(response, admission.lease);

  try {
    let parsedBody: any;
    try {
      parsedBody = await request.json();
    } catch {
      return finishAdmission(errorResponse(400, "Invalid JSON body"));
    }
    const parsed = z.object({}).passthrough().safeParse(parsedBody);
    if (!parsed.success || Array.isArray(parsed.data)) {
      return finishAdmission(errorResponse(400, "Request body must be a JSON object"));
    }
    parsedBody = parsed.data;

    const structuralAdmission = await admitChatStructure(parsedBody, admission.lease, {
      sessionId,
      queueMs: CHAT_ADMISSION_QUEUE_MAX_MS,
      signal: request.signal,
    });
    if (structuralAdmission.admit === false) {
      admission.lease?.release();
      return finishAdmission(structuralAdmission.response);
    }
    admission.lease = structuralAdmission.lease;

    let guardResult;
    try {
      guardResult = injectionGuard(parsedBody);
    } catch (error) {
      console.error("[SECURITY] Injection guard error:", error);
      return finishAdmission(new Response(JSON.stringify({ error: "Security check failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }));
    }

    const { blocked, result } = guardResult;
    if (blocked) {
      return finishAdmission(new Response(JSON.stringify({
        error: {
          message: "Request blocked: potential prompt injection detected",
          type: "injection_detected",
          code: "SECURITY_001",
          detections: result.detections.length,
        },
      }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }));
    }
    if (result.flagged) {
      try {
        request.headers.set("X-Injection-Flagged", "true");
        request.headers.set("X-Injection-Detections", String(result.detections.length));
      } catch {
        // Immutable headers: the detection still applies.
      }
    }

    const { request: resolved, body: resolvedBody } = await withCodexPreferredModel(request, parsedBody);
    const accept = String(request.headers.get("accept") || "");
    const wantsStreaming = resolveStreamFlag(resolvedBody?.stream, accept, "openai-responses");
    if (wantsStreaming) {
      const correlationId = generateRequestId();
      const handlerResponse = releaseChatAdmissionAfterHandler(
        handleChat(resolved, null, resolvedBody, correlationId),
        admission.lease,
      );
      return withEarlyStreamKeepalive(handlerResponse, {
        signal: request.signal,
        thresholdMs: resolveKeepaliveThreshold(resolvedBody?.model),
        startupFrame: OPENAI_RESPONSES_IN_PROGRESS_FRAME,
        applicationKeepalive: {
          frame: OPENAI_RESPONSES_IN_PROGRESS_FRAME,
          intervalMs: SSE_HEARTBEAT_INTERVAL_MS,
        },
        errorFrame: OPENAI_RESPONSES_ERROR_FRAME,
        correlationId,
      });
    }
    return finishAdmission(await handleChat(resolved, null, resolvedBody));
  } catch (error) {
    admission.lease?.release();
    throw error;
  }
}

export const POST = postHandler;
