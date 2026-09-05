import { Injectable } from "@nestjs/common";

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class MusicService {
  async handleGetGenerations(req?: Request): Promise<Response> {
    const { getSpecialtyModelsResponse } = await load(
      "@shiguang-gateway/core-domain/edge/specialty-catalog"
    );
    return getSpecialtyModelsResponse(
      req,
      "/v1/music/generations",
      (model: { type?: string }) => model.type === "music"
    );
  }

  async handleCreateGeneration(req: Request): Promise<Response> {
    const { withInjectionGuard } = await load(
      "@shiguang-gateway/core-domain/middleware/prompt-injection"
    );

    const postHandler = async (request: Request): Promise<Response> => {
      const [
        { handleMusicGeneration },
        { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
        { parseMusicModel, getMusicProvider },
        { errorResponse },
        { readMediaGenerationBody, promptRequiredResponse, successfulMediaGenerationResponse, failedMediaGenerationResponse },
        { enforceApiKeyPolicy },
        { isAllRateLimitedCredentials, rateLimitedProviderResponse },
        log,
      ] = await Promise.all([
        load("@shiguang-gateway/open-sse/handlers/musicGeneration.ts"),
        load("@shiguang-gateway/core-domain/sse/auth"),
        load("@shiguang-gateway/open-sse/config/musicRegistry.ts"),
        load("@shiguang-gateway/open-sse/utils/error.ts"),
        load("@shiguang-gateway/core-domain/edge/media-generation"),
        load("@shiguang-gateway/core-domain/shared/api-key-policy"),
        load("@shiguang-gateway/core-domain/edge/rate-limit"),
        load("@shiguang-gateway/core-domain/sse/logger"),
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
