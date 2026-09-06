import { providerEmbeddingsSchema } from "./provider-embeddings.schemas.js";

type ProviderParams = { params: { provider: string } };

const load = (specifier: string): Promise<any> => import(specifier);

/** CORS preflight for `/v1/providers/:provider/embeddings`. */
export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * POST /v1/providers/{provider}/embeddings
 *
 * Provider selection is deliberately performed here rather than in the shared
 * embedding engine: the provider-scoped route owns alias/prefix validation and
 * credential selection, while `handleEmbedding` remains the cross-route
 * upstream dispatch contract.
 */
export async function POST(request: Request, { params }: ProviderParams): Promise<Response> {
  const [errorApi, constants, registry, auth, embedding, logger, policyApi, validation] =
    await Promise.all([
      load("@shiguang-gateway/open-sse/utils/error"),
      load("@shiguang-gateway/open-sse/config/constants"),
      load("@shiguang-gateway/open-sse/config/providerRegistry"),
      load("@shiguang-gateway/open-sse/services/auth"),
      load("@shiguang-gateway/open-sse"),
      load("@shiguang-gateway/core-domain/sse/logger"),
      load("@shiguang-gateway/core-domain/runtime/api-key-policy"),
      load("@shiguang-gateway/core-domain/shared/validation/helpers"),
    ]);
  const { errorResponse, unavailableResponse } = errorApi;
  const { HTTP_STATUS } = constants;
  const { getRegistryEntry } = registry;
  const { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState } = auth;
  const { handleEmbedding } = embedding;
  const { enforceApiKeyPolicy } = policyApi;
  const { isValidationFailure, validateBody } = validation;

  const rawProvider = params.provider;
  const providerEntry = getRegistryEntry(rawProvider);
  if (!providerEntry) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, `Unknown provider: ${rawProvider}`);
  }

  const providerAlias = providerEntry.alias || providerEntry.id;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }
  const parsed = validateBody(providerEmbeddingsSchema, rawBody);
  if (isValidationFailure(parsed)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, parsed.error.message);
  }
  const body = parsed.data as Record<string, any> & { model?: string };

  // Add the provider prefix when callers use an unqualified model id.
  if (body.model && !body.model.includes("/")) {
    body.model = `${providerAlias}/${body.model}`;
  }

  const policy = await enforceApiKeyPolicy(request, body.model ?? null);
  if (policy.rejection) return policy.rejection;

  // A provider-scoped endpoint must never dispatch a model belonging to a
  // different provider, even when the model is already prefixed.
  if (body.model) {
    const prefix = body.model.split("/")[0];
    if (prefix !== providerAlias && prefix !== rawProvider && prefix !== providerEntry.id) {
      return errorResponse(
        HTTP_STATUS.BAD_REQUEST,
        `Model "${body.model}" does not belong to provider "${rawProvider}"`,
      );
    }
  }

  const credentials = await getProviderCredentialsWithQuotaPreflight(providerEntry.id);
  if (!credentials) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${rawProvider}`);
  }
  if (credentials.allRateLimited) {
    return unavailableResponse(
      HTTP_STATUS.RATE_LIMITED,
      `[${rawProvider}] All accounts rate limited`,
      credentials.retryAfter,
      credentials.retryAfterHuman,
    );
  }

  const result = await handleEmbedding({
    body,
    credentials,
    log: logger,
    // Preserve the selected connection so hard upstream failures cool down
    // the same account instead of being retried on every request.
    connectionId: credentials.connectionId ?? null,
  });

  if (result.success) {
    await clearRecoveredProviderState(credentials);
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: result.error }), {
    status: result.status || 500,
    headers: { "Content-Type": "application/json" },
  });
}
