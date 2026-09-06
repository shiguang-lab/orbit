import { v1ClassifySchema } from "./classify.schemas.js";

const load = (specifier: string): Promise<any> => import(specifier);

const JINA_FOUNDATION_PROVIDER_ID = "jina-ai";
const JINA_FOUNDATION_BASE_URL = "https://api.jina.ai";

/** Handle CORS preflight for the Jina classification endpoint. */
export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function postHandler(request: Request): Promise<Response> {
  const [jina, auth, errorApi, constants, policyApi, validationHelpers, rateLimit] = await Promise.all([
    load("@shiguang-gateway/open-sse/handlers/jinaFoundation"),
    load("@shiguang-gateway/core-domain/sse/auth"),
    load("@shiguang-gateway/open-sse/utils/error"),
    load("@shiguang-gateway/open-sse/config/constants"),
    load("@shiguang-gateway/core-domain/shared/api-key-policy"),
    load("@shiguang-gateway/core-domain/shared/validation/helpers"),
    load("@shiguang-gateway/core-domain/edge/rate-limit"),
  ]);
  const { handleJinaFoundationProxy } = jina;
  const { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState } = auth;
  const { errorResponse } = errorApi;
  const { HTTP_STATUS } = constants;
  const { enforceApiKeyPolicy } = policyApi;
  const { isValidationFailure, validateBody } = validationHelpers;
  const { isAllRateLimitedCredentials, rateLimitedProviderResponse } = rateLimit;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1ClassifySchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data;
  const model = typeof body.model === "string" ? body.model : undefined;

  const policy = await enforceApiKeyPolicy(request, model || "jina-ai/classify");
  if (policy.rejection) return policy.rejection;

  const credentials = await getProviderCredentialsWithQuotaPreflight(JINA_FOUNDATION_PROVIDER_ID);
  if (!credentials) {
    return errorResponse(
      HTTP_STATUS.BAD_REQUEST,
      `No credentials for provider: ${JINA_FOUNDATION_PROVIDER_ID}`,
    );
  }
  if (isAllRateLimitedCredentials(credentials)) {
    return rateLimitedProviderResponse(JINA_FOUNDATION_PROVIDER_ID, credentials);
  }

  const response = await handleJinaFoundationProxy({
    path: "/v1/classify",
    upstreamUrl: `${JINA_FOUNDATION_BASE_URL}/v1/classify`,
    body,
    credentials,
    provider: JINA_FOUNDATION_PROVIDER_ID,
    model: model || null,
  });
  if (response?.ok) await clearRecoveredProviderState(credentials);
  return response;
}

/** POST /v1/classify — Jina zero/few-shot classification. */
export async function POST(request: Request): Promise<Response> {
  const { withInjectionGuard } = await load("@shiguang-gateway/core-domain/middleware/prompt-injection");
  return withInjectionGuard(postHandler)(request);
}
