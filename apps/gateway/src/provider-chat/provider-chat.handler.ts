import { isCommonChatGptWebRetiredProviderId } from "@orbit/contracts/chatgpt-web-retirement";
import { providerChatBodySchema, type ProviderChatBody } from "./provider-chat.schemas.js";

type ProviderParams = { params: { provider: string } };
type ChatRuntime = typeof import("@orbit/inference/handlers/chat");

let initialized = false;

async function runtime(): Promise<{
  chat: ChatRuntime;
  initTranslators: () => void;
  errorResponse: (status: number, message: string, classification?: any) => Response;
  badRequest: number;
  withChatAdmission: (handler: any) => any;
  getRegistryEntry: (provider: string) => { id: string; alias?: string } | null;
}> {
  const [chat, sse, errorApi, constants, registry, admission] = await Promise.all([
    import("@orbit/inference/handlers/chat"),
    import("@orbit/inference/translator"),
    import("@orbit/inference/utils/error"),
    import("@orbit/inference/config/constants"),
    import("@orbit/inference/config/providerRegistry"),
    import("../chat-admission.js"),
  ]);
  return {
    chat,
    initTranslators: sse.initTranslators,
    errorResponse: errorApi.errorResponse,
    badRequest: constants.HTTP_STATUS.BAD_REQUEST,
    withChatAdmission: admission.withChatAdmission,
    getRegistryEntry: registry.getRegistryEntry,
  };
}

async function ensureInitialized(initTranslators: () => void) {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function postHandler(request: Request, { params }: ProviderParams): Promise<Response> {
  const { provider: rawProvider } = params;
  const loaded = await runtime();
  if (isCommonChatGptWebRetiredProviderId(rawProvider)) {
    return loaded.errorResponse(410, "Provider is retired and unavailable.", {
      type: "provider_error",
      code: "PROVIDER_RETIRED",
    });
  }

  const providerEntry = loaded.getRegistryEntry(rawProvider);
  if (!providerEntry) return loaded.errorResponse(loaded.badRequest, `Unknown provider: ${rawProvider}`);
  const providerAlias = providerEntry.alias || providerEntry.id;
  await ensureInitialized(loaded.initTranslators);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return loaded.errorResponse(loaded.badRequest, "Invalid JSON body");
  }
  const parsed = providerChatBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const isNotObject = !rawBody || typeof rawBody !== "object" || Array.isArray(rawBody);
    return loaded.errorResponse(
      loaded.badRequest,
      isNotObject ? "Request body must be a JSON object" : "model must be a string",
    );
  }
  const body = parsed.data as ProviderChatBody;
  if (body.model) {
    const modelParts = body.model.split("/");
    const hasProviderPrefix = modelParts.length >= 2;
    const modelProvider = hasProviderPrefix ? modelParts[0] : null;
    if (
      hasProviderPrefix &&
      modelProvider !== providerAlias &&
      modelProvider !== rawProvider &&
      modelProvider !== providerEntry.id
    ) {
      return loaded.errorResponse(
        loaded.badRequest,
        `Model "${body.model}" does not belong to provider "${rawProvider}". Expected prefix: ${providerAlias}/`,
      );
    }
    if (!hasProviderPrefix) body.model = `${providerAlias}/${body.model}`;
  }
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
    signal: request.signal,
  });
  return loaded.chat.handleChat(newRequest, () => loaded.chat.buildClientRawRequest(request, rawBody));
}

export async function POST(request: Request, params: ProviderParams): Promise<Response> {
  const { withChatAdmission } = await runtime();
  return withChatAdmission(postHandler)(request, params);
}
