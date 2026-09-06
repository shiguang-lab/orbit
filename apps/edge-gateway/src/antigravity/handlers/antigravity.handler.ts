type ChatRuntime = typeof import("@shiguang-gateway/open-sse/handlers/chat");

let initialized = false;

const load = (specifier: string): Promise<any> => import(specifier);

async function runtime(): Promise<{
  chat: ChatRuntime;
  initTranslators: () => void;
  withChatAdmission: (handler: (request: Request) => Promise<Response>) =>
    (request: Request) => Promise<Response>;
}> {
  const [chat, translator, admission] = await Promise.all([
    load("@shiguang-gateway/open-sse/handlers/chat"),
    load("@shiguang-gateway/open-sse/translator"),
    load("@shiguang-gateway/core-domain/edge/chat-admission"),
  ]);
  return {
    chat: chat as ChatRuntime,
    initTranslators: translator.initTranslators,
    withChatAdmission: admission.withChatAdmission,
  };
}

/** Initialize the bidirectional protocol translators once per edge process. */
async function ensureInitialized(initTranslators: () => void): Promise<void> {
  if (initialized) return;
  await initTranslators();
  initialized = true;
  console.log("[SSE] Translators initialized for /v1/antigravity");
}

/** Handle CORS preflight for the cloud-code compatible endpoint. */
export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * POST /v1/antigravity — Antigravity/cloudcode-compatible endpoint.
 *
 * The request and response envelopes are translated by the existing chat
 * pipeline. Keeping that pipeline here preserves cloud-code admission and the
 * bidirectional translator contract while the route transport is Nest-owned.
 */
async function postHandler(request: Request): Promise<Response> {
  const loaded = await runtime();
  await ensureInitialized(loaded.initTranslators);
  return loaded.chat.handleChat(request);
}

export async function POST(request: Request): Promise<Response> {
  const { withChatAdmission } = await runtime();
  return withChatAdmission(postHandler)(request);
}
