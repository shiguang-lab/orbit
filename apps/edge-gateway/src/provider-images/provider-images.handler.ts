import { handleImageGeneration } from "@orbit/inference/handlers/imageGeneration";
import { errorResponse, unavailableResponse } from "@orbit/inference/utils/error";
import { HTTP_STATUS } from "@orbit/inference/config/constants";
import {
  getProviderCredentialsWithQuotaPreflight,
  clearRecoveredProviderState,
} from "@orbit/inference/services/auth";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { getImageProvider } from "@orbit/inference/config/imageRegistry";
import * as log from "@orbit/core/sse/logger";
import { toJsonErrorPayload } from "@orbit/core/shared/upstream-error";
import { enforceApiKeyPolicy } from "@orbit/core/runtime/api-key-policy";
import { v1ImageGenerationSchema } from "@orbit/core/edge/image-generation-validation";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { enforceClientApiRouteAuth } from "../common/client-api-route-auth.js";
import { runWithCallLogApiKeyContext } from "@orbit/core/usage/call-log-api-key-context";
import { executeImageWithCredentialFallback } from "@orbit/inference/services/imageCredentialRetry";
import {
  CHATGPT_WEB_RETIRED_ERROR_CODE,
  CHATGPT_WEB_RETIRED_MESSAGE,
  isCommonChatGptWebRetiredProviderId,
} from "@orbit/contracts/chatgpt-web-retirement";

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
  if (isAllRateLimitedCredentials(credentials)) {
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
