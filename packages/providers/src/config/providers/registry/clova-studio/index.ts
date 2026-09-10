import type { RegistryEntry } from "../../shared.ts";

export const clova_studioProvider: RegistryEntry = {
  id: "clova-studio",
  alias: "clova",
  format: "clova",
  executor: "clova-studio",
  baseUrl: "https://clovastudio.stream.ntruss.com/v3/chat-completions",
  authType: "apikey",
  authHeader: "bearer",
  forceStream: true,
  models: [
    {
      id: "HCX-007",
      name: "HCX-007",
      contextLength: 128000,
      maxOutputTokens: 32768,
      supportsReasoning: true,
    },
    {
      id: "HCX-005",
      name: "HCX-005",
      contextLength: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
    },
    {
      id: "HCX-DASH-002",
      name: "HCX-DASH-002",
      contextLength: 32000,
      maxOutputTokens: 4096,
    },
  ],
};
