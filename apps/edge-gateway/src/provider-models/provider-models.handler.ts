import { getUnifiedModelsResponse } from "@shiguang-gateway/open-sse/catalog/unified";
import { getServiceModels, isServiceBackendPluginId } from "@shiguang-gateway/core-domain/embedded-services/catalog";
import { getProviderByAlias, getProviderById } from "@shiguang-gateway/core-domain/catalog/providers";
import { isCompatibleProviderConnectionId } from "@shiguang-gateway/core-domain/shared/compatible-provider-id";
import { getRegistryEntry } from "@shiguang-gateway/open-sse/config/providerRegistry";

/** CORS preflight for provider model discovery. */
export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** GET /v1/providers/{provider}/models — list one provider's unprefixed models. */
export async function GET(
  request: Request,
  context: { params?: Record<string, string> } = {},
): Promise<Response> {
  const rawProvider = context.params?.provider ?? "";
  if (isServiceBackendPluginId(rawProvider)) {
    const models = getServiceModels(rawProvider).filter((model) => model.available !== false);
    return Response.json({
      object: "list",
      data: models.map((model) => ({
        object: model.object || "model",
        owned_by: rawProvider,
        ...model,
        id: model.id,
        parent: null,
      })),
    });
  }

  const providerEntry = getRegistryEntry(rawProvider);
  let providerId = rawProvider;
  let providerAlias = rawProvider;
  if (providerEntry) {
    providerId = providerEntry.id;
    providerAlias = providerEntry.alias || providerId;
  } else {
    const catalogEntry = getProviderById(rawProvider) ?? getProviderByAlias(rawProvider);
    if (catalogEntry) {
      providerId = catalogEntry.id;
      providerAlias = catalogEntry.alias || providerId;
    } else if (!isCompatibleProviderConnectionId(rawProvider)) {
      return Response.json(
        { error: { message: `Unknown provider: ${rawProvider}`, type: "invalid_request_error", code: "invalid_provider" } },
        { status: 400 },
      );
    }
  }

  const response = await getUnifiedModelsResponse(request);
  const payload = (await response.clone().json().catch(() => null)) as
    | { object?: string; data?: Array<Record<string, any>> }
    | null;
  if (!response.ok || !payload || !Array.isArray(payload.data)) return response;

  const toUnprefixedModelId = (model: Record<string, any>) => {
    const root = typeof model.root === "string" && model.root.trim().length > 0 ? model.root : null;
    if (root) return root;
    const id = typeof model.id === "string" ? model.id : "";
    if (!id) return id;
    if (id.startsWith(`${providerAlias}/`)) return id.slice(providerAlias.length + 1);
    if (id.startsWith(`${providerId}/`)) return id.slice(providerId.length + 1);
    return id;
  };
  const deduped = new Map<string, Record<string, any>>();
  for (const model of payload.data.filter((entry) => entry?.owned_by === providerId)) {
    const id = toUnprefixedModelId(model);
    if (!id || deduped.has(id)) continue;
    deduped.set(id, { ...model, id, parent: null });
  }
  return Response.json(
    { object: payload.object || "list", data: [...deduped.values()] },
    { status: response.status, headers: response.headers },
  );
}
