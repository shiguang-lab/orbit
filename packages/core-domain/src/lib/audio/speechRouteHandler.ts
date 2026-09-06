import { handleAudioSpeech } from "../../../../open-sse/handlers/audioSpeech.ts";
import { withInjectionGuard } from "../../middleware/promptInjectionGuard.ts";
import {
  getProviderCredentialsWithQuotaPreflight,
  clearRecoveredProviderState,
} from "../../sse/services/auth.ts";
import { parseSpeechModel, getSpeechProvider } from "../../../../open-sse/config/audioRegistry.ts";
import { resolveDynamicAudioProviders } from "../edge/audioProviderNodes.ts";
import { errorResponse } from "@shiguang-gateway/http-kernel/error-response";
import { HTTP_STATUS } from "@shiguang-gateway/contracts/http-status";
import { enforceApiKeyPolicy } from "../../shared/utils/apiKeyPolicy.ts";
import { v1AudioSpeechSchema } from "../../shared/validation/schemas.ts";
import { isValidationFailure, validateBody } from "../../shared/validation/helpers.ts";
import {
  isAllRateLimitedCredentials,
  rateLimitedProviderResponse,
} from "../edge/rateLimit.ts";
import { attachShiguangGatewayMetaToResponse } from "../../domain/gatewayResponseMeta.ts";
import { calculateModalCost } from "../usage/costCalculator.ts";
import { generateRequestId } from "../../shared/utils/requestId.ts";

/** Handle CORS preflight for the OpenAI-compatible speech endpoint. */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/audio/speech — text-to-speech. */
async function postHandler(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const validation = validateBody(v1AudioSpeechSchema, rawBody);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }
  const body = validation.data;
  const startTime = Date.now();

  const policy = await enforceApiKeyPolicy(request, body.model);
  if (policy.rejection) return policy.rejection;

  // A bare model may name a configured speech combo. Resolve it before the
  // provider/model parser so the advertised model catalog remains usable.
  if (body.model && typeof body.model === "string" && !body.model.includes("/")) {
    const { getComboByName } = await import("../db/combos.ts");
    const combo = await getComboByName(body.model);
    if (combo) {
      const { executeSpeechCombo } = await import("../../../../open-sse/services/speechCombo.ts");
      return executeSpeechCombo(body.model, body, startTime);
    }
  }

  const dynamicProviders = await resolveDynamicAudioProviders("/audio/speech", "audio-speech");
  const { provider, model: resolvedModel } = parseSpeechModel(body.model, dynamicProviders);
  if (!provider) {
    return errorResponse(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid speech model: ${body.model}. Use format: provider/model`
    );
  }

  const providerConfig =
    getSpeechProvider(provider) || dynamicProviders.find((dp) => dp.id === provider) || null;

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

  let response = await handleAudioSpeech({
    body,
    credentials,
    resolvedProvider: providerConfig,
    resolvedModel,
  });
  if (response?.ok) {
    await clearRecoveredProviderState(credentials);
    const characters = typeof body.input === "string" ? body.input.length : 0;
    const costUsd = await calculateModalCost("audio", provider, resolvedModel || body.model, {
      characters,
    });
    response = attachShiguangGatewayMetaToResponse(response, {
      provider,
      model: resolvedModel || body.model,
      costUsd,
      latencyMs: Date.now() - startTime,
      requestId: generateRequestId(),
    });
  }
  return response;
}

export const POST = withInjectionGuard(postHandler);
// Allow large audio payloads; synthesis may involve long text and streamed audio.
export const maxDuration = 300;
