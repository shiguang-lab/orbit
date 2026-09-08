import { getSyncedAvailableModelsByConnection } from "../db/models.ts";
import { isSelfHostedChatProvider, resolveProviderId } from "@orbit/providers/catalog";

export type LocalSyncedEndpointRoute = {
  provider: string;
  model: string;
  connectionIds: string[];
};

export function isImageModelId(modelId: string | null | undefined): boolean {
  if (!modelId || typeof modelId !== "string") return false;
  const leaf = (modelId.includes("/") ? modelId.slice(modelId.lastIndexOf("/") + 1) : modelId).toLowerCase();
  if (
    leaf.startsWith("gpt-image-") ||
    leaf.startsWith("dall-e-") ||
    leaf === "chatgpt-image-latest" ||
    leaf.startsWith("flux") ||
    leaf.includes("midjourney") ||
    leaf.includes("stable-diffusion") ||
    leaf.includes("sdxl") ||
    leaf.startsWith("imagen") ||
    leaf.startsWith("ideogram") ||
    leaf.startsWith("recraft") ||
    leaf.startsWith("cogview") ||
    leaf.startsWith("kolors")
  ) {
    return true;
  }
  if (leaf.includes("image") && !leaf.includes("chat") && !leaf.includes("text") && !leaf.includes("embed")) {
    return true;
  }
  return false;
}

export async function resolveLocalSyncedEndpointRoute(
  modelStr: string,
  endpoint: "embeddings" | "images"
): Promise<LocalSyncedEndpointRoute | null> {
  const slashIndex = modelStr.indexOf("/");
  if (slashIndex <= 0 || slashIndex === modelStr.length - 1) return null;

  const provider = resolveProviderId(modelStr.slice(0, slashIndex));
  const model = modelStr.slice(slashIndex + 1);
  if (!isSelfHostedChatProvider(provider) && !provider.startsWith("openai-compatible-")) return null;

  const byConnection = await getSyncedAvailableModelsByConnection(provider);
  const connectionIds = Object.entries(byConnection)
    .filter(([, models]) =>
      models.some(
        (candidate) =>
          candidate.id === model &&
          (candidate.supportedEndpoints?.includes(endpoint) ||
            candidate.supportedEndpoints?.includes(`${endpoint}/generations`) ||
            (endpoint === "images" && isImageModelId(candidate.id)))
      )
    )
    .map(([connectionId]) => connectionId);

  return connectionIds.length > 0 ? { provider, model, connectionIds } : null;
}
