import { Injectable } from "@nestjs/common";
import { isAllRateLimitedCredentials } from "@orbit/inference/services/credential-selection";
import { rateLimitedProviderResponse } from "../common/provider-rate-limit-response.js";

// Moderation orchestration lives in the edge app.  Keep the legacy domain
// implementation as a callable provider, but do not import the deleted Next
// route module (its historical .d.ts exposed POST although the implementation
// only exports handleModeration).
const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class ModerationsService {
  async handleModerations(req: Request): Promise<Response> {
    const { withInjectionGuard } = await load(
      "@orbit/core/middleware/prompt-injection"
    );

    const postHandler = async (request: Request): Promise<Response> => {
      const [
        { handleModeration },
        { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
        { parseModerationModel },
        { errorResponse },
        { v1ModerationSchema },
        { isValidationFailure, validateBody },
        { enforceApiKeyPolicy },
      ] = await Promise.all([
        load("@orbit/inference/handlers/moderations"),
        load("@orbit/inference/services/auth"),
        load("@orbit/inference/config/moderationRegistry"),
        load("@orbit/inference/utils/error"),
        load("@orbit/core/edge/moderation-validation-schemas"),
        load("@orbit/core/shared/validation/helpers"),
        load("@orbit/core/runtime/api-key-policy"),
      ]);

      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return errorResponse(400, "Invalid JSON body");
      }

      const validation = validateBody(v1ModerationSchema, rawBody);
      if (isValidationFailure(validation)) {
        return errorResponse(400, validation.error.message);
      }
      const body = validation.data;
      const model = body.model || "omni-moderation-latest";
      const policy = await enforceApiKeyPolicy(request, model);
      if (policy.rejection) return policy.rejection;

      const { provider } = parseModerationModel(model);
      const resolvedProvider = provider || "openai";
      const credentials = await getProviderCredentialsWithQuotaPreflight(resolvedProvider);
      if (!credentials) {
        return errorResponse(400, `No credentials for provider: ${resolvedProvider}`);
      }
      if (isAllRateLimitedCredentials(credentials)) {
        return rateLimitedProviderResponse(resolvedProvider, credentials);
      }

      const response = await handleModeration({ body: { ...body, model }, credentials });
      if (response?.ok) {
        await clearRecoveredProviderState(credentials as Record<string, unknown>);
      }
      return response;
    };

    return withInjectionGuard(postHandler)(req);
  }
}
