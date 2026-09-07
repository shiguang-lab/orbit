import { Injectable } from "@nestjs/common";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { audioOptionsResponse } from "./audio-options.js";
import { resolveDynamicAudioProviders, type AudioProvider } from "./audio-provider-nodes.js";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

/** Application service for POST /v1/audio/translations. */
@Injectable()
export class AudioTranslationService {
  handleOptions(): Response {
    return audioOptionsResponse();
  }

  async handleAudioTranslations(request: Request): Promise<Response> {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      const { errorResponse } = await load("@orbit/inference/utils/error");
      return errorResponse(400, "Invalid multipart form data");
    }

    const model = formData.get("model");
    if (!model) {
      const { errorResponse } = await load("@orbit/inference/utils/error");
      return errorResponse(400, "Missing model");
    }
    const modelStr = String(model);
    const [{ enforceApiKeyPolicy }, { errorResponse }] = await Promise.all([
      load("@orbit/core/runtime/api-key-policy"),
      load("@orbit/inference/utils/error"),
    ]);
    const policy = await enforceApiKeyPolicy(request, modelStr);
    if (policy.rejection) return policy.rejection;

    const dynamicProviders = await resolveDynamicAudioProviders(
      "/audio/translations",
      "audio-transcriptions",
    );
    const [
      { parseTranslationModel, getTranslationProvider },
      { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
      { handleAudioTranslation },
    ] = await Promise.all([
      load("@orbit/inference/config/audioRegistry"),
      load("@orbit/inference/services/auth"),
      load("@orbit/inference/handlers/audioTranslation"),
    ]);
    const { provider, model: resolvedModel } = parseTranslationModel(modelStr, dynamicProviders);
    if (!provider) {
      return errorResponse(
        400,
        `Invalid translation model: ${modelStr}. Use format: provider/model`,
      );
    }
    const providerConfig: AudioProvider | null =
      getTranslationProvider(provider) ||
      dynamicProviders.find((candidate) => candidate.id === provider) ||
      null;

    let credentials: any = null;
    if (providerConfig && providerConfig.authType !== "none") {
      const credentialKey = providerConfig.credentialProviderId || provider;
      credentials = await getProviderCredentialsWithQuotaPreflight(credentialKey);
      if (!credentials) return errorResponse(400, `No credentials for provider: ${provider}`);
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(provider, credentials);
      }
    }

    const startTime = Date.now();
    let response = await handleAudioTranslation({
      formData,
      credentials,
      resolvedProvider: providerConfig,
      resolvedModel,
    });
    if (response?.ok) {
      await clearRecoveredProviderState(credentials);
      try {
        const [{ attachShiguangGatewayMetaToResponse }, { generateRequestId }] = await Promise.all([
          load("@orbit/core/edge/gateway-response-meta"),
          load("@orbit/core/runtime/request-id"),
        ]);
        response = attachShiguangGatewayMetaToResponse(response, {
          provider,
          model: resolvedModel,
          costUsd: 0,
          latencyMs: Date.now() - startTime,
          requestId: generateRequestId(),
        });
      } catch {
        // Telemetry is best effort.
      }
    }
    return response;
  }
}
