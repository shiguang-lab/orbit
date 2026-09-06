const load = (specifier: string): Promise<any> => import(specifier as string);

export type VideoModelTarget = {
  provider: string | null;
  model: string | null;
  isCustomModel: boolean;
};

export async function resolveVideoModelTarget(modelStr: string | null | undefined): Promise<VideoModelTarget> {
  const [{ parseVideoModel }, { getAllCustomModels }] = await Promise.all([
    load("@shiguang-gateway/open-sse/config/videoRegistry.ts"),
    load("@shiguang-gateway/core-domain/edge/local-db"),
  ]);
  const parsed = parseVideoModel(modelStr ?? null);
  if (parsed.provider) return { provider: parsed.provider, model: parsed.model, isCustomModel: false };
  if (!modelStr) return { provider: null, model: null, isCustomModel: false };
  try {
    const customModelsMap = (await getAllCustomModels()) as Record<string, unknown>;
    for (const [providerId, models] of Object.entries(customModelsMap)) {
      if (!Array.isArray(models)) continue;
      for (const model of models as Array<{ id?: string; supportedEndpoints?: unknown }>) {
        if (!model?.id || !Array.isArray(model.supportedEndpoints)) continue;
        if (model.supportedEndpoints.includes("videos") && `${providerId}/${model.id}` === modelStr) {
          return { provider: providerId, model: model.id, isCustomModel: true };
        }
      }
    }
  } catch {
    // Registry failures are reported as an invalid model below.
  }
  return { provider: null, model: null, isCustomModel: false };
}

export function isVideoPromptOptional(parsed: VideoModelTarget): boolean {
  return (
    (parsed.model === "happyhorse-1.1-i2v" &&
      (parsed.provider === "alibaba" || parsed.provider === "bailian-coding-plan" ||
        parsed.provider === "qwen-cloud-token-plan" || parsed.provider === "qwen-cloud")) ||
    (parsed.provider === "qwen-cloud" && parsed.model === "wan2.7-i2v") ||
    (parsed.provider === "alibaba" &&
      (parsed.model === "wan2.7-i2v-2026-04-25" || parsed.model === "wan2.6-i2v-flash"))
  );
}

export async function resolveLocalOverrideCredentials(provider: string): Promise<any> {
  const [{ getProviderCredentialsWithQuotaPreflight }, { isAllRateLimitedCredentials }] = await Promise.all([
    load("@shiguang-gateway/core-domain/sse/auth"),
    load("@shiguang-gateway/core-domain/edge/rate-limit"),
  ]);
  const localCredentials = await getProviderCredentialsWithQuotaPreflight(provider);
  return localCredentials && !isAllRateLimitedCredentials(localCredentials) ? localCredentials : null;
}
