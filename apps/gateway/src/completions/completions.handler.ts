import { buildClientRawRequest, handleChat } from "@orbit/inference/handlers/chat";
import { withChatAdmission } from "../chat-admission.js";
import { createInjectionGuard } from "@orbit/core/middleware/prompt-injection";
import { initTranslators } from "@orbit/inference/translator";
import { CORS_HEADERS } from "../common/cors.js";
import {
  readCompressionRequestHeader,
  withCompressionHeaderEcho,
} from "./compression-header-echo.js";
import { asTextCompletionResponse } from "./text-completion-transform.js";

let initPromise: Promise<void> | null = null;
const injectionGuard = createInjectionGuard();

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = Promise.resolve(initTranslators()).then(() => {
      console.log("[SSE] Translators initialized");
    });
  }
  return initPromise;
}

/** Handle CORS preflight for the legacy OpenAI Completions API. */
export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * POST /v1/completions — legacy OpenAI Completions API.
 *
 * Legacy `{ prompt, model }` requests are normalized to chat format before
 * routing, then translated back to the text-completion response shape.
 */
async function postHandler(request: Request): Promise<Response> {
  await ensureInitialized();
  const compressionRequestHeader = readCompressionRequestHeader(request);

  try {
    const cloned = request.clone();
    const body = await cloned.json().catch(() => null);
    if (body) {
      const { blocked, result } = injectionGuard(body);
      if (blocked) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Request blocked: potential prompt injection detected",
              type: "injection_detected",
              code: "SECURITY_001",
              detections: result.detections.length,
            },
          }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }

      // Normalize legacy completions format: { prompt, model } → { messages, model }.
      if (body.prompt !== undefined && !body.messages) {
        const prompt = Array.isArray(body.prompt) ? body.prompt.join("\n") : String(body.prompt);
        const normalized = {
          ...body,
          messages: [{ role: "user", content: prompt }],
        };
        delete normalized.prompt;
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(normalized),
          signal: request.signal,
        });

        return withCompressionHeaderEcho(
          await asTextCompletionResponse(
            await handleChat(newRequest, () => buildClientRawRequest(request, body)),
            typeof body.model === "string" ? body.model : undefined,
          ),
          compressionRequestHeader,
        );
      }
    }
  } catch (error) {
    console.error("[SECURITY] Prompt injection guard failed:", error);
  }

  let requestedModel: string | undefined;
  try {
    const bodyForModel = await request.clone().json().catch(() => null);
    if (bodyForModel && typeof bodyForModel.model === "string") {
      requestedModel = bodyForModel.model;
    }
  } catch {
    // asTextCompletionResponse falls back to upstream body.model.
  }

  return withCompressionHeaderEcho(
    await asTextCompletionResponse(await handleChat(request), requestedModel),
    compressionRequestHeader,
  );
}

export const POST = withChatAdmission(postHandler);
