import { handleChat } from "@shiguang-gateway/open-sse/handlers/chat";
import { withChatAdmission } from "../chat-admission.js";
import { withInjectionGuard } from "@shiguang-gateway/core-domain/middleware/prompt-injection";
import { initTranslators } from "@shiguang-gateway/open-sse/translator";
import {
  ANTHROPIC_PING_FRAME,
  withEarlyStreamKeepalive,
} from "@shiguang-gateway/open-sse/utils/earlyStreamKeepalive";
import { resolveKeepaliveThreshold } from "@shiguang-gateway/open-sse/utils/keepaliveThreshold";
import { resolveStreamFlag } from "@shiguang-gateway/open-sse/utils/aiSdkCompat";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await initTranslators();
  initialized = true;
  console.log("[SSE] Translators initialized for /v1/messages");
}

function requireJsonContentType(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "PATCH") return null;
  const contentType = (request.headers.get("content-type") ?? "").trim().toLowerCase();
  if (contentType.startsWith("application/json")) return null;
  return new Response(
    JSON.stringify({
      error: {
        message: "Content-Type must be application/json",
        type: "invalid_request_error",
        code: "unsupported_media_type",
      },
    }),
    {
      status: 415,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function postHandler(
  request: Request,
  _context?: unknown,
  preParsedBody: any = null,
): Promise<Response> {
  const contentTypeRejection = requireJsonContentType(request);
  if (contentTypeRejection) return contentTypeRejection;

  await ensureInitialized();
  let body = preParsedBody;
  if (body == null) {
    try {
      body = await request.clone().json().catch(() => null);
    } catch {
      // Let handleChat produce its normal validation response.
    }
  }

  const accept = String(request.headers.get("accept") || "");
  const wantsStreaming = resolveStreamFlag(body?.stream, accept, "claude");
  if (wantsStreaming) {
    return withEarlyStreamKeepalive(handleChat(request, null, body), {
      signal: request.signal,
      thresholdMs: resolveKeepaliveThreshold(body?.model),
      keepaliveFrame: ANTHROPIC_PING_FRAME,
    });
  }
  return handleChat(request, null, body);
}

export const POST = withChatAdmission(withInjectionGuard(postHandler));
