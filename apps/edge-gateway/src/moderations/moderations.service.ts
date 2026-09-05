import { Injectable } from "@nestjs/common";

// Moderation orchestration lives in the edge app.  Keep the legacy domain
// implementation as a callable provider, but do not import the deleted Next
// route module (its historical .d.ts exposed POST although the implementation
// only exports handleModeration).
const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class ModerationsService {
  async handleModerations(req: Request): Promise<Response> {
    const { withInjectionGuard } = await load(
      "@shiguang-gateway/core-domain/middleware/prompt-injection"
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
        { isAllRateLimitedCredentials, rateLimitedProviderResponse },
      ] = await Promise.all([
        load("@shiguang-gateway/open-sse/handlers/moderations.ts"),
        load("@shiguang-gateway/core-domain/sse/auth"),
        load("@shiguang-gateway/open-sse/config/moderationRegistry.ts"),
        load("@shiguang-gateway/open-sse/utils/error.ts"),
        load("@shiguang-gateway/core-domain/edge/moderation-validation-schemas"),
        load("@shiguang-gateway/core-domain/edge/moderation-validation-helpers"),
        load("@shiguang-gateway/core-domain/shared/api-key-policy"),
        load("@shiguang-gateway/core-domain/edge/rate-limit"),
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
