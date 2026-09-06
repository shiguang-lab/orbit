import { getAllCustomModels } from "@shiguang-gateway/core-domain/runtime/models-db";
import { isAllRateLimitedCredentials } from "@shiguang-gateway/core-domain/edge/rate-limit";
import { parseVideoModel } from "../config/videoRegistry.ts";
import { getProviderCredentialsWithQuotaPreflight } from "./auth.ts";

export type VideoModelTarget = {
  provider: string | null;
  model: string | null;
  isCustomModel: boolean;
};

export async function resolveVideoModelTarget(
  modelStr: string | null | undefined,
): Promise<VideoModelTarget> {
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
    // Registry failures resolve as an unknown model.
  }
  return { provider: null, model: null, isCustomModel: false };
}

export function isVideoPromptOptional(parsed: { provider: string | null; model: string | null }) {
  return (
    (parsed.model === "happyhorse-1.1-i2v" &&
      (parsed.provider === "alibaba" || parsed.provider === "bailian-coding-plan" ||
        parsed.provider === "qwen-cloud-token-plan" || parsed.provider === "qwen-cloud")) ||
    (parsed.provider === "qwen-cloud" && parsed.model === "wan2.7-i2v") ||
    (parsed.provider === "alibaba" &&
      (parsed.model === "wan2.7-i2v-2026-04-25" || parsed.model === "wan2.6-i2v-flash"))
  );
}

export async function resolveLocalOverrideCredentials(provider: string) {
  const credentials = await getProviderCredentialsWithQuotaPreflight(provider);
  return credentials && !isAllRateLimitedCredentials(credentials) ? credentials : null;
}
