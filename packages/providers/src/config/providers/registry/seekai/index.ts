import { buildOpenAiCompatibleRegistryEntry } from "../../shared.ts";

export const seekaiProvider = buildOpenAiCompatibleRegistryEntry({
  id: "seekai",
  alias: "ska",
  baseUrl: "https://seekai.cc/v1/chat/completions",
  modelsUrl: "https://seekai.cc/v1/models",
  models: [],
  passthroughModels: true,
});
