import { Injectable } from "@nestjs/common";
import { resolveDynamicAudioProviders } from "./audio-provider-nodes.js";
import { audioOptionsResponse } from "./audio-options.js";
import { audioSpeechSchema, formatValidationError } from "./audio-schemas.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

/** Application service for POST /v1/audio/speech. */
@Injectable()
export class AudioSpeechService {
  handleOptions(): Response {
    return audioOptionsResponse();
  }

  async handleAudioSpeech(request: Request): Promise<Response> {
    const { withInjectionGuard } = await load(
      "@shiguang-gateway/core-domain/middleware/prompt-injection",
    );
    return withInjectionGuard((guardedRequest: Request) => this.post(guardedRequest))(request);
  }

  private async post(request: Request): Promise<Response> {
    const [{ handleAudioSpeech }, { errorResponse }, { getSpeechProvider, parseSpeechModel }, { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState }, { enforceApiKeyPolicy }, { isAllRateLimitedCredentials, rateLimitedProviderResponse }] = await Promise.all([
      load("@shiguang-gateway/open-sse/handlers/audioSpeech"),
      load("@shiguang-gateway/open-sse/utils/error"),
      load("@shiguang-gateway/open-sse/config/audioRegistry"),
      load("@shiguang-gateway/core-domain/sse/auth"),
      load("@shiguang-gateway/core-domain/shared/api-key-policy"),
      load("@shiguang-gateway/core-domain/edge/rate-limit"),
    ]);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }
    const validation = audioSpeechSchema.safeParse(rawBody);
    if (!validation.success) return errorResponse(400, formatValidationError(validation.error));

    const body = validation.data;
    const startTime = Date.now();
    const policy = await enforceApiKeyPolicy(request, body.model);
    if (policy.rejection) return policy.rejection;

    // Bare model names may refer to configured speech combos. Combo execution
    // remains an explicit edge application concern rather than a core route.
    if (!body.model.includes("/")) {
      const { getComboByName } = await load("@shiguang-gateway/core-domain/edge/local-db");
      const combo = await getComboByName(body.model);
      if (combo) {
        const { executeSpeechCombo } = await load("@shiguang-gateway/open-sse/services/speechCombo");
        return executeSpeechCombo(body.model, body, startTime);
      }
    }

    const dynamicProviders = await resolveDynamicAudioProviders("/audio/speech", "audio-speech");
    const { provider, model: resolvedModel } = parseSpeechModel(body.model, dynamicProviders);
    if (!provider) {
      return errorResponse(400, `Invalid speech model: ${body.model}. Use format: provider/model`);
    }
    const providerConfig =
      getSpeechProvider(provider) || dynamicProviders.find((candidate) => candidate.id === provider) || null;

    let credentials: any = null;
    if (providerConfig && providerConfig.authType !== "none") {
      const credentialKey = providerConfig.credentialProviderId || provider;
      credentials = await getProviderCredentialsWithQuotaPreflight(credentialKey);
      if (!credentials) return errorResponse(400, `No credentials for provider: ${provider}`);
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
      try {
        const [{ calculateModalCost }, { attachShiguangGatewayMetaToResponse }, { generateRequestId }] = await Promise.all([
          load("@shiguang-gateway/core-domain/pricing/modal-cost"),
          load("@shiguang-gateway/core-domain/edge/gateway-response-meta"),
          load("@shiguang-gateway/core-domain/edge/request-id"),
        ]);
        const characters = typeof body.input === "string" ? body.input.length : 0;
        const costUsd = await calculateModalCost("audio", provider, resolvedModel || body.model, { characters });
        response = attachShiguangGatewayMetaToResponse(response, {
          provider,
          model: resolvedModel || body.model,
          costUsd,
          latencyMs: Date.now() - startTime,
          requestId: generateRequestId(),
        });
      } catch {
        // Usage metadata is additive; never turn a successful audio response
        // into an error when an optional telemetry store is unavailable.
      }
    }
    return response;
  }
}
