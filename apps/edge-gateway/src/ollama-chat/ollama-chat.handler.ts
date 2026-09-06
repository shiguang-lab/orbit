import { handleChat } from "@shiguang-gateway/core-domain/edge/chat-handler";
import { withChatAdmission } from "@shiguang-gateway/core-domain/edge/chat-admission";
import { initTranslators } from "@shiguang-gateway/open-sse/translator";
import { transformToOllama } from "@shiguang-gateway/open-sse/utils/ollamaTransform";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await initTranslators();
  initialized = true;
  console.log("[SSE] Translators initialized for Ollama chat");
}

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function postHandler(request: Request): Promise<Response> {
  await ensureInitialized();
  const clonedRequest = request.clone();
  let model = "llama3.2";
  try {
    const body = await clonedRequest.json();
    model = body.model || model;
  } catch {
    // The shared chat handler owns malformed body handling.
  }
  return transformToOllama(await handleChat(request), model);
}

export const POST = withChatAdmission(postHandler);
