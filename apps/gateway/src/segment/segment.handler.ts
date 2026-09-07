import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

const JINA_FOUNDATION_PROVIDER_ID = "jina-ai";
const JINA_SEGMENT_BASE_URL = "https://segment.jina.ai";

/** Handle CORS preflight for the Jina segment endpoint. */
export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function postHandler(request: Request): Promise<Response> {
  const [jina, auth, errorApi, constants, policyApi, validationApi, validationHelpers] = await Promise.all([
    load("@orbit/inference/handlers/jinaFoundation"),
    load("@orbit/inference/services/auth"),
    load("@orbit/inference/utils/error"),
    load("@orbit/inference/config/constants"),
    load("@orbit/core/runtime/api-key-policy"),
    load("@orbit/core/edge/segment-validation"),
    load("@orbit/core/shared/validation/helpers"),
  ]);
  const { handleJinaFoundationProxy } = jina;
  const { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState } = auth;
  const { errorResponse } = errorApi;
  const { HTTP_STATUS } = constants;
  const { enforceApiKeyPolicy } = policyApi;
  const { v1SegmentSchema } = validationApi;
  const { isValidationFailure, validateBody } = validationHelpers;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1SegmentSchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data;

  const policy = await enforceApiKeyPolicy(request, "jina-ai/segment");
  if (policy.rejection) return policy.rejection;

  const credentials = await getProviderCredentialsWithQuotaPreflight(JINA_FOUNDATION_PROVIDER_ID);
  if (!credentials) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${JINA_FOUNDATION_PROVIDER_ID}`);
  }
  if (isAllRateLimitedCredentials(credentials)) {
    return rateLimitedProviderResponse(JINA_FOUNDATION_PROVIDER_ID, credentials);
  }

  const response = await handleJinaFoundationProxy({
    path: "/v1/segment",
    upstreamUrl: `${JINA_SEGMENT_BASE_URL}/`,
    body,
    credentials,
    provider: JINA_FOUNDATION_PROVIDER_ID,
    model: "segment",
  });
  if (response?.ok) await clearRecoveredProviderState(credentials);
  return response;
}

/** POST /v1/segment — Jina Foundation segmenter. */
export async function POST(request: Request): Promise<Response> {
  const { withInjectionGuard } = await load("@orbit/core/middleware/prompt-injection");
  return withInjectionGuard(postHandler)(request);
}
