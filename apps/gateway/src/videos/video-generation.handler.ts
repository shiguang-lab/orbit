/**
 * Edge-owned HTTP boundary for POST /v1/videos/generations.
 *
 * Provider executors are still being decomposed out of the legacy open-sse
 * package.  Keep that implementation behind dynamic imports so this app's
 * Nest build only depends on the request/response contract at compile time.
 */

import {
  isVideoPromptOptional,
  resolveLocalOverrideCredentials,
  resolveVideoModelTarget,
} from "./video-model-resolution.js";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

export const dynamic = "force-dynamic";

export async function OPTIONS(): Promise<Response> {
  const { mediaGenerationOptionsResponse } = await load(
    "@orbit/core/edge/media-generation",
  );
  return mediaGenerationOptionsResponse();
}

export async function GET(request?: Request): Promise<Response> {
  const [{ getSpecialtyModelsResponse }] = await Promise.all([
    load("@orbit/inference/catalog/specialty"),
  ]);
  return getSpecialtyModelsResponse(
    request,
    "/v1/videos/generations",
    (model: Record<string, unknown>) => model.type === "video",
  );
}

async function postHandler(request: Request): Promise<Response> {
  const [
    { handleVideoGeneration },
    { resolveVideoCredentialProvider },
    { withInjectionGuard },
    { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
    { getVideoProvider },
    { errorResponse },
    { HTTP_STATUS },
    log,
    { enforceApiKeyPolicy },
    {
      failedMediaGenerationResponse,
      isMediaGenerationFailure,
      promptRequiredResponse,
      readMediaGenerationBody,
      successfulMediaGenerationResponse,
    },
  ] = await Promise.all([
    load("@orbit/inference/handlers/videoGeneration"),
    load("@orbit/inference/handlers/videoGeneration/googleFlow"),
    load("@orbit/core/middleware/prompt-injection"),
    load("@orbit/inference/services/auth"),
    load("@orbit/inference/config/videoRegistry"),
    load("@orbit/inference/utils/error"),
    load("@orbit/inference/config/constants"),
    load("@orbit/core/sse/logger"),
    load("@orbit/core/runtime/api-key-policy"),
    load("@orbit/core/edge/media-generation"),
  ]);

  const guardedPost = async (guardedRequest: Request): Promise<Response> => {
    const parsed = await readMediaGenerationBody(guardedRequest, log, "VIDEO");
    if (parsed.state === "invalid") return parsed.response;

    const body = parsed.body;
    const startTime = Date.now();
    const policy = await enforceApiKeyPolicy(guardedRequest, body.model);
    if (policy.rejection) return policy.rejection;

    if (body.model && !body.model.includes("/")) {
      const { getComboByName } = await load("@orbit/core/db/combos");
      const combo = await getComboByName(body.model);
      if (combo) {
        const { executeVideoCombo } = await load("@orbit/inference/services/videoCombo");
        return executeVideoCombo(body.model, body, { request: guardedRequest, policy }, startTime, log);
      }
    }

    const resolvedTarget = await resolveVideoModelTarget(body.model);
    const { provider, model: requestedModel, isCustomModel } = resolvedTarget;
    if (!provider) {
      return errorResponse(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid video model: ${body.model}. Use format: provider/model`,
      );
    }

    if (!isVideoPromptOptional(resolvedTarget)) {
      const promptError = promptRequiredResponse(body);
      if (promptError) return promptError;
    }

    const providerConfig = getVideoProvider(provider);
    let credentials: any = null;
    if (providerConfig && providerConfig.authType !== "none") {
      credentials = await getProviderCredentialsWithQuotaPreflight(
        resolveVideoCredentialProvider(provider),
      );
      if (!credentials) {
        return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for video provider: ${provider}`);
      }
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(provider, credentials);
      }
    } else if (isCustomModel) {
      credentials = await getProviderCredentialsWithQuotaPreflight(provider, null, null, requestedModel);
      if (!credentials) {
        return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for custom video provider: ${provider}`);
      }
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(provider, credentials);
      }
    } else if (providerConfig?.authType === "none") {
      credentials = await resolveLocalOverrideCredentials(provider);
    }

    const result = await handleVideoGeneration({
      body,
      credentials,
      log,
      ...(isCustomModel && { resolvedProvider: provider }),
    });

    if (isMediaGenerationFailure(result)) {
      return failedMediaGenerationResponse(result, "Video generation provider error");
    }

    await clearRecoveredProviderState(credentials);
    return successfulMediaGenerationResponse({
      result: { data: result.data },
      billingMode: "video",
      provider,
      model: body.model,
      startTime,
      duration: body.duration,
    });
  };

  return withInjectionGuard(guardedPost)(request);
}

export async function POST(request: Request): Promise<Response> {
  return postHandler(request);
}
