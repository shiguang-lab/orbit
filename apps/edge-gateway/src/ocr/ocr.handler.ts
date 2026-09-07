import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

/** Handle CORS preflight for the document OCR endpoint. */
export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * Resolve provider-specific endpoint metadata without coupling the Nest app to the
 * legacy Next route tree. The Vertex project/region resolver remains behind the OCR
 * handler boundary because it reuses the existing service-account token exchange.
 */
function resolveOcrCredentials<T extends {
  baseUrl?: string;
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}>(credentials: T, providerId: string | undefined, resolveVertexOcrBaseUrl: (value: T) => string | null): T {
  if (credentials?.baseUrl) return credentials;
  const providerSpecificBaseUrl = credentials?.providerSpecificData?.baseUrl;
  if (typeof providerSpecificBaseUrl === "string" && providerSpecificBaseUrl.trim()) {
    return { ...credentials, baseUrl: providerSpecificBaseUrl };
  }
  if (providerId === "vertex-deepseek-ocr") {
    const vertexBaseUrl = resolveVertexOcrBaseUrl(credentials);
    if (vertexBaseUrl) return { ...credentials, baseUrl: vertexBaseUrl };
  }
  return credentials;
}

async function postHandler(request: Request): Promise<Response> {
  const [ocrHandler, ocrRegistry, auth, errorApi, constants, policyApi, validationApi, validationHelpers] = await Promise.all([
    load("@orbit/inference/handlers/ocr"),
    load("@orbit/inference/config/ocrRegistry"),
    load("@orbit/inference/services/auth"),
    load("@orbit/inference/utils/error"),
    load("@orbit/inference/config/constants"),
    load("@orbit/core/runtime/api-key-policy"),
    load("@orbit/core/edge/ocr-validation"),
    load("@orbit/core/shared/validation/helpers"),
  ]);

  const { handleOcr, resolveVertexOcrAccessToken, resolveVertexOcrBaseUrl } = ocrHandler;
  const { parseOcrModel } = ocrRegistry;
  const { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState } = auth;
  const { errorResponse } = errorApi;
  const { HTTP_STATUS } = constants;
  const { enforceApiKeyPolicy } = policyApi;
  const { v1OcrSchema } = validationApi;
  const { isValidationFailure, validateBody } = validationHelpers;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1OcrSchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data;
  const model = body.model || "mistral-ocr-latest";

  const policy = await enforceApiKeyPolicy(request, model);
  if (policy.rejection) return policy.rejection;

  const { provider } = parseOcrModel(model);
  const resolvedProvider = provider || "mistral";
  const credentials = await getProviderCredentialsWithQuotaPreflight(resolvedProvider);
  if (!credentials) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${resolvedProvider}`);
  }
  if (isAllRateLimitedCredentials(credentials)) {
    return rateLimitedProviderResponse(resolvedProvider, credentials);
  }

  const tokenReadyCredentials = await resolveVertexOcrAccessToken(resolvedProvider, credentials);
  const ocrCredentials = resolveOcrCredentials(tokenReadyCredentials, resolvedProvider, resolveVertexOcrBaseUrl);
  const response = await handleOcr({ body: { ...body, model }, credentials: ocrCredentials });
  if (response?.ok) await clearRecoveredProviderState(credentials);
  return response;
}

/** POST /v1/ocr — Mistral-compatible document OCR. */
export async function POST(request: Request): Promise<Response> {
  const { withInjectionGuard } = await load("@orbit/core/middleware/prompt-injection");
  return withInjectionGuard(postHandler)(request);
}
