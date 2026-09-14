// Antigravity CLI (`agy`) model catalog.
//
// These models are pinned from the live `:fetchAvailableModels` endpoint
// (https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels) using a
// real `agy` consumer-OAuth token. The public catalog exposes one base row per
// model family; native effort, tiered, and thinking ids are request-time details.
//
// The `agy` provider reuses the `antigravity` executor/translator (identical backend),
// but keeps its own catalog so the CLI and IDE model surfaces can evolve independently.
// Both currently expose the same callable Claude/Gemini/GPT set. Tab-completion models
// (`tab_flash_lite_preview`, `tab_jump_flash_lite_preview`) are intentionally excluded —
// they are not chat-callable.

export const AGY_PUBLIC_MODELS = Object.freeze([
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    contextLength: 1048576,
    maxOutputTokens: 65536,
    supportsReasoning: true,
    supportsThinking: true,
    supportedThinkingEfforts: ["low", "medium", "high"],
    tieredModelId: "gemini-3.8-flash-tiered",
    effortModelIds: {
      low: "gemini-3.8-flash-tiered",
      medium: "gemini-3.8-flash-tiered",
      high: "gemini-3.8-flash-tiered",
    },
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    contextLength: 1048576,
    maxOutputTokens: 65536,
    supportsReasoning: true,
    supportsThinking: true,
    supportedThinkingEfforts: ["low", "medium", "high"],
    tieredModelId: "gemini-3.7-flash-tiered",
    effortModelIds: {
      low: "gemini-3.7-flash-tiered",
      medium: "gemini-3.7-flash-tiered",
      high: "gemini-3.7-flash-tiered",
    },
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    contextLength: 1048576,
    maxOutputTokens: 65536,
    supportsReasoning: true,
    supportsThinking: true,
    supportedThinkingEfforts: ["low", "medium", "high"],
    tieredModelId: "gemini-3.6-flash-tiered",
    effortModelIds: {
      low: "gemini-3.6-flash-tiered",
      medium: "gemini-3.6-flash-tiered",
      high: "gemini-3.6-flash-tiered",
    },
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    contextLength: 1048576,
    maxOutputTokens: 65535,
    supportsReasoning: true,
    supportsThinking: true,
    supportedThinkingEfforts: ["low", "high"],
    effortModelIds: {
      low: "gemini-3.1-pro-low",
      high: "gemini-pro-agent",
    },
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    contextLength: 1048576,
    maxOutputTokens: 65535,
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image",
    contextLength: 1048576,
    maxOutputTokens: 65535,
    apiFormat: "images-generations",
    supportedEndpoints: ["images"],
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    contextLength: 1048576,
    maxOutputTokens: 65536,
    supportsReasoning: true,
    supportsThinking: true,
    thinkingModelId: "claude-opus-4-6-thinking",
    alwaysThinking: true,
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    contextLength: 1048576,
    maxOutputTokens: 65536,
    supportsReasoning: true,
    supportsThinking: true,
    supportsVision: true,
    toolCalling: true,
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    contextLength: 131072,
    maxOutputTokens: 32768,
    supportsReasoning: true,
    supportsThinking: true,
    supportedThinkingEfforts: ["medium"],
    effortModelIds: { medium: "gpt-oss-120b-medium" },
    toolCalling: true,
  },
]);

const AGY_PUBLIC_MODEL_IDS = new Set(
  AGY_PUBLIC_MODELS.flatMap((model) => [
    model.id,
    ...(model.supportedThinkingEfforts || []).map((effort) => `${model.id}-${effort}`),
    ...(model.effortModelIds ? Object.values(model.effortModelIds) : []),
    ...(model.tieredModelId ? [model.tieredModelId] : []),
    ...(model.thinkingModelId ? [model.thinkingModelId] : []),
  ])
);
const AGY_NON_CHAT_MODEL_IDS = new Set(["tab_flash_lite_preview", "tab_jump_flash_lite_preview"]);
const AGY_RETIRED_MODEL_IDS = new Set([
  "gemini-3-flash-agent",
  "gemini-3.5-flash",
  "gemini-3.5-flash-extra-low",
  "gemini-3.5-flash-low",
  "gemini-3.5-flash-high",
  "gemini-3.5-flash-medium",
  "gemini-3.5-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash-thinking",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

const AGY_CLIENT_VISIBLE_MODEL_NAMES = Object.freeze(
  AGY_PUBLIC_MODELS.reduce<Record<string, string>>((acc, model) => {
    acc[model.id] = model.name;
    return acc;
  }, {})
);

export function getClientVisibleAgyModelName(modelId: string, fallbackName?: string): string {
  return AGY_CLIENT_VISIBLE_MODEL_NAMES[modelId] || fallbackName || modelId;
}

export function isUserCallableAgyModelId(modelId: string): boolean {
  return !!modelId && AGY_PUBLIC_MODEL_IDS.has(modelId);
}

export function isDiscoverableAgyModelId(modelId: string): boolean {
  return !!modelId && !AGY_NON_CHAT_MODEL_IDS.has(modelId) && !AGY_RETIRED_MODEL_IDS.has(modelId);
}
