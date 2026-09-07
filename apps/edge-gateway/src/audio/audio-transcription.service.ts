import { Injectable } from "@nestjs/common";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { audioOptionsResponse } from "./audio-options.js";
import { resolveDynamicAudioProviders, type AudioProvider } from "./audio-provider-nodes.js";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

/** Application service for POST /v1/audio/transcriptions. */
@Injectable()
export class AudioTranscriptionService {
  handleOptions(): Response {
    return audioOptionsResponse();
  }

  async handleAudioTranscriptions(request: Request): Promise<Response> {
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

    const startTime = Date.now();
    // A bare model can be a configured combo. Keep combo fan-out in this app's
    // feature service so the legacy Next route is not part of the edge runtime.
    if (!modelStr.includes("/")) {
      try {
        const [{ getComboByName, getCombos }, { getDatabaseSettings }] = await Promise.all([
          load("@orbit/core/db/combos"),
          load("@orbit/core/db/database-settings"),
        ]);
        const combo = await getComboByName(modelStr);
        if (combo) {
          const [{ handleComboChat }, { log }] = await Promise.all([
            load("@orbit/inference/services/combo"),
            load("@orbit/inference/utils/logger"),
          ]);
          let allCombos: any[] = [];
          try {
            allCombos = await getCombos();
          } catch {
            allCombos = [];
          }
          let settings: Record<string, unknown> = {};
          try {
            settings = getDatabaseSettings();
          } catch {
            settings = {};
          }
          return handleComboChat({
            body: { model: modelStr },
            combo,
            handleSingleModel: async (_body: unknown, targetModel: string) =>
              this.transcribeWithModel(formData, targetModel, startTime),
            isModelAvailable: undefined,
            log,
            settings,
            allCombos,
            relayOptions: undefined,
            signal: undefined,
          });
        }
      } catch (error) {
        try {
          const { log } = await load("@orbit/inference/utils/logger");
          log.error("AUDIO", `Combo resolution failed for ${modelStr}: ${error}`);
        } catch {
          // Combo lookup is optional; the concrete provider path still works.
        }
      }
    }
    return this.transcribeWithModel(formData, modelStr, startTime);
  }

  private async transcribeWithModel(
    formData: FormData,
    modelStr: string,
    startTime: number,
  ): Promise<Response> {
    const [
      { handleAudioTranscription },
      { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
      { parseTranscriptionModel, getTranscriptionProvider, audioModelAliasCandidates, findAlternateAudioProvider, listAlternateAudioModelIds, missingAudioProviderCredentialsMessage, AUDIO_TRANSCRIPTION_PROVIDERS },
      { errorResponse },
    ] = await Promise.all([
      load("@orbit/inference/handlers/audioTranscription"),
      load("@orbit/inference/services/auth"),
      load("@orbit/inference/config/audioRegistry"),
      load("@orbit/inference/utils/error"),
    ]);

    const dynamicProviders = await resolveDynamicAudioProviders(
      "/audio/transcriptions",
      "audio-transcriptions",
    );
    const parsed = parseTranscriptionModel(modelStr, dynamicProviders);
    let provider = parsed.provider;
    let resolvedModel = parsed.model;
    if (!provider) {
      return errorResponse(
        400,
        `Invalid transcription model: ${modelStr}. Use format: provider/model`,
      );
    }
    let providerConfig: AudioProvider | null =
      getTranscriptionProvider(provider) ||
      dynamicProviders.find((candidate) => candidate.id === provider) ||
      null;

    let credentials: any = null;
    if (providerConfig && providerConfig.authType !== "none") {
      const credentialKey = providerConfig.credentialProviderId || provider;
      credentials = await getProviderCredentialsWithQuotaPreflight(credentialKey);
      if (!credentials) {
        const candidates = audioModelAliasCandidates(modelStr, provider, resolvedModel);
        const alternate = findAlternateAudioProvider(
          AUDIO_TRANSCRIPTION_PROVIDERS,
          provider,
          candidates,
        );
        if (alternate) {
          const alternateCredentials = await getProviderCredentialsWithQuotaPreflight(
            alternate.provider,
          );
          if (alternateCredentials && !isAllRateLimitedCredentials(alternateCredentials)) {
            provider = alternate.provider;
            resolvedModel = alternate.model;
            providerConfig = alternate.config;
            credentials = alternateCredentials;
          }
        }
      }
      if (!credentials) {
        const candidates = audioModelAliasCandidates(modelStr, provider, resolvedModel);
        return errorResponse(
          400,
          missingAudioProviderCredentialsMessage(
            provider,
            listAlternateAudioModelIds(AUDIO_TRANSCRIPTION_PROVIDERS, provider, candidates),
          ),
        );
      }
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(provider, credentials);
      }
    }

    let response = await handleAudioTranscription({
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
        // Telemetry headers are additive and must not break a valid transcript.
      }
    }
    return response;
  }
}
