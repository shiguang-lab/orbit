import { handleAudioTranslation } from "../../../../open-sse/handlers/audioTranslation.ts";
import {
  getProviderCredentialsWithQuotaPreflight,
  clearRecoveredProviderState,
} from "../../sse/services/auth.ts";
import { parseTranslationModel, getTranslationProvider } from "../../../../open-sse/config/audioRegistry.ts";
import { resolveDynamicAudioProviders } from "../edge/audioProviderNodes.ts";
import { errorResponse } from "../../../../open-sse/utils/error.ts";
import { HTTP_STATUS } from "@shiguang-gateway/contracts/http-status";
import { enforceApiKeyPolicy } from "../../shared/utils/apiKeyPolicy.ts";
import {
  isAllRateLimitedCredentials,
  rateLimitedProviderResponse,
} from "../edge/rateLimit.ts";
import { attachShiguangGatewayMetaToResponse } from "../../domain/gatewayResponseMeta.ts";
import { generateRequestId } from "../../shared/utils/requestId.ts";

/** Handle CORS preflight for the OpenAI-compatible translation endpoint. */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/audio/translations — translate audio to English text. */
export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid multipart form data");
  }

  const startTime = Date.now();
  const model = formData.get("model");
  if (!model) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");
  }
  const modelStr = String(model);

  const policy = await enforceApiKeyPolicy(request, modelStr);
  if (policy.rejection) return policy.rejection;

  // Translation is served by transcription-capable nodes (Whisper-style
  // endpoints expose both), plus general chat/responses gateways.
  const dynamicProviders = await resolveDynamicAudioProviders(
    "/audio/translations",
    "audio-transcriptions"
  );
  const { provider, model: resolvedModel } = parseTranslationModel(modelStr, dynamicProviders);
  if (!provider) {
    return errorResponse(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid translation model: ${modelStr}. Use format: provider/model`
    );
  }

  const providerConfig =
    getTranslationProvider(provider) || dynamicProviders.find((dp) => dp.id === provider) || null;

  let credentials = null;
  if (providerConfig && providerConfig.authType !== "none") {
    const credentialKey = providerConfig.credentialProviderId || provider;
    credentials = await getProviderCredentialsWithQuotaPreflight(credentialKey);
    if (!credentials) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
    }
    if (isAllRateLimitedCredentials(credentials)) {
      return rateLimitedProviderResponse(provider, credentials);
    }
  }

  let response = await handleAudioTranslation({
    formData,
    credentials,
    resolvedProvider: providerConfig,
    resolvedModel,
  });
  if (response?.ok) {
    await clearRecoveredProviderState(credentials);
    response = attachShiguangGatewayMetaToResponse(response, {
      provider,
      model: resolvedModel,
      costUsd: 0,
      latencyMs: Date.now() - startTime,
      requestId: generateRequestId(),
    });
  }
  return response;
}

// Allow large audio uploads; translation may process long recordings.
export const maxDuration = 300;
