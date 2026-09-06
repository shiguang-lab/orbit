import { handleImageGeneration } from "@shiguang-gateway/open-sse/handlers/imageGeneration";
import { errorResponse, unavailableResponse } from "@shiguang-gateway/open-sse/utils/error";
import { HTTP_STATUS } from "@shiguang-gateway/open-sse/config/constants";
import {
  getProviderCredentialsWithQuotaPreflight,
  clearRecoveredProviderState,
} from "@shiguang-gateway/open-sse/services/auth";
import { getImageProvider } from "@shiguang-gateway/open-sse/config/imageRegistry";
import * as log from "@shiguang-gateway/core-domain/sse/logger";
import { toJsonErrorPayload } from "@shiguang-gateway/core-domain/shared/upstream-error";
import { enforceApiKeyPolicy } from "@shiguang-gateway/core-domain/shared/api-key-policy";
import { v1ImageGenerationSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { enforceClientApiRouteAuth } from "@shiguang-gateway/core-domain/shared/client-api-auth";
import { runWithCallLogApiKeyContext } from "@shiguang-gateway/core-domain/usage/call-log-api-key-context";
import { executeImageWithCredentialFallback } from "@shiguang-gateway/open-sse/services/imageCredentialRetry";
import {
  CHATGPT_WEB_RETIRED_ERROR_CODE,
  CHATGPT_WEB_RETIRED_MESSAGE,
  isCommonChatGptWebRetiredProviderId,
} from "@shiguang-gateway/contracts/chatgpt-web-retirement";

const HTTP = { ...HTTP_STATUS, GONE: 410 } as const;

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/providers/:provider/images/generations. */
export async function POST(request: Request, provider: string): Promise<Response> {
  const rawProvider = provider.trim();
  if (isCommonChatGptWebRetiredProviderId(rawProvider)) {
    return errorResponse(HTTP.GONE, CHATGPT_WEB_RETIRED_MESSAGE, {
      type: "provider_error",
      code: CHATGPT_WEB_RETIRED_ERROR_CODE,
    });
  }

  const imageProvider = getImageProvider(rawProvider);
  if (!imageProvider) return errorResponse(HTTP.BAD_REQUEST, `Unknown image provider: ${rawProvider}`);

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return errorResponse(HTTP.BAD_REQUEST, "Invalid JSON body"); }
  const validation = validateBody(v1ImageGenerationSchema, rawBody);
  if (isValidationFailure(validation)) return errorResponse(HTTP.BAD_REQUEST, validation.error.message);
  const body = validation.data as { model: string; [key: string]: any };
  if (!body.model.includes("/")) body.model = `${rawProvider}/${body.model}`;

  const authRejection = await enforceClientApiRouteAuth(request);
  if (authRejection) return authRejection;
  const policy = await enforceApiKeyPolicy(request, body.model);
  if (policy.rejection) return policy.rejection;

  const modelProvider = body.model.split("/")[0];
  if (modelProvider !== rawProvider) {
    return errorResponse(HTTP.BAD_REQUEST, `Model "${body.model}" does not belong to image provider "${rawProvider}"`);
  }
  const requestedModel = body.model.slice(String(rawProvider).length + 1);
  let credentials = await getProviderCredentialsWithQuotaPreflight(rawProvider, null, null, requestedModel);
  if (!credentials) return errorResponse(HTTP.BAD_REQUEST, `No credentials for image provider: ${rawProvider}`);
  if (credentials.allRateLimited) {
    return unavailableResponse(HTTP.RATE_LIMITED, `[${rawProvider}] All accounts rate limited`, credentials.retryAfter, credentials.retryAfterHuman);
  }

  const execution = await executeImageWithCredentialFallback({
    provider: rawProvider,
    requestedModel,
    credentials,
    execute: (attemptCredentials) => runWithCallLogApiKeyContext(
      { apiKeyId: policy.apiKeyInfo?.id ?? null, apiKeyName: policy.apiKeyInfo?.name ?? null },
      () => handleImageGeneration({ body, credentials: attemptCredentials, log }),
    ),
  });
  credentials = execution.credentials;
  const result = execution.result as any;
  if (result.success) {
    await clearRecoveredProviderState(credentials);
    return new Response(JSON.stringify(result.data), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const errorPayload = toJsonErrorPayload(result.error, "Image generation provider error") as any;
  const message = typeof errorPayload?.error?.message === "string" ? errorPayload.error.message : "Image generation provider error";
  return errorResponse(result.status, message);
}
