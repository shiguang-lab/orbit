import { Injectable } from "@nestjs/common";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class MusicService {
  async handleGetGenerations(req?: Request): Promise<Response> {
    const { getSpecialtyModelsResponse } = await load(
      "@orbit/inference/catalog/specialty"
    );
    return getSpecialtyModelsResponse(
      req,
      "/v1/music/generations",
      (model: { type?: string }) => model.type === "music"
    );
  }

  async handleCreateGeneration(req: Request): Promise<Response> {
    const { withInjectionGuard } = await load(
      "@orbit/core/middleware/prompt-injection"
    );

    const postHandler = async (request: Request): Promise<Response> => {
      const [
        { handleMusicGeneration },
        { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
        { parseMusicModel, getMusicProvider },
        { errorResponse },
        { readMediaGenerationBody, promptRequiredResponse, successfulMediaGenerationResponse, failedMediaGenerationResponse },
        { enforceApiKeyPolicy },
        log,
      ] = await Promise.all([
        load("@orbit/inference/handlers/musicGeneration"),
        load("@orbit/inference/services/auth"),
        load("@orbit/inference/config/musicRegistry"),
        load("@orbit/inference/utils/error"),
        load("@orbit/core/edge/media-generation"),
        load("@orbit/core/runtime/api-key-policy"),
        load("@orbit/core/sse/logger"),
      ]);

      const parsed = await readMediaGenerationBody(request, log, "MUSIC");
      if (parsed.state === "invalid") return parsed.response;
      const body = parsed.body;
      const startTime = Date.now();
      const promptError = promptRequiredResponse(body);
      if (promptError) return promptError;

      const policy = await enforceApiKeyPolicy(request, body.model);
      if (policy.rejection) return policy.rejection;
      const { provider } = parseMusicModel(body.model);
      if (!provider) {
        return errorResponse(400, `Invalid music model: ${body.model}. Use format: provider/model`);
      }

      const providerConfig = getMusicProvider(provider);
      let credentials: any = null;
      if (providerConfig && providerConfig.authType !== "none") {
        credentials = await getProviderCredentialsWithQuotaPreflight(provider);
        if (!credentials) return errorResponse(400, `No credentials for music provider: ${provider}`);
        if (isAllRateLimitedCredentials(credentials)) {
          return rateLimitedProviderResponse(provider, credentials);
        }
      } else if (providerConfig?.authType === "none") {
        const local = await getProviderCredentialsWithQuotaPreflight(provider);
        credentials = local && !isAllRateLimitedCredentials(local) ? local : null;
      }

      const result = await handleMusicGeneration({ body, credentials, log });
      if (result.success) {
        await clearRecoveredProviderState(credentials);
        return successfulMediaGenerationResponse({
          result,
          billingMode: "audio",
          provider,
          model: body.model,
          startTime,
          duration: body.duration,
        });
      }
      return failedMediaGenerationResponse(result, "Music generation provider error");
    };

    return withInjectionGuard(postHandler)(req);
  }
}
