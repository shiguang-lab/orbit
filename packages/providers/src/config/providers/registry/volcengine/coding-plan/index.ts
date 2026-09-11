import type { RegistryEntry, RegistryModel } from "../../../shared.ts";

/**
 * Volcano Ark Coding Plan models.
 *
 * The Coding Plan subscription (console.volcengine.com/ark/subscription/coding-plan)
 * is served by a DEDICATED endpoint — `/api/coding/v3` — which differs from both the
 * standard pay-per-use API (`/api/v3`) and the Agent Plan API (`/api/plan/v3`). Using
 * the wrong base URL returns HTTP 401 "The API key or AK/SK ... is missing or invalid"
 * even with a valid Coding Plan key. The list below follows the official
 * Coding Plan catalog; the upstream `/models` directory is not used as the
 * user-facing catalog because it includes extra versioned/non-plan entries.
 */
export const VOLCENGINE_CODING_PLAN_MODELS: RegistryModel[] = [
  { id: "ark-code-latest", name: "Auto", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "doubao-seed-2-1-turbo", name: "Doubao-Seed-2.1-turbo", contextLength: 262144, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "doubao-seed-2.0-lite", name: "Doubao-Seed-2.0-lite", contextLength: 262144, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "glm-5.3-flash", name: "GLM-5.3-Flash", contextLength: 1048576, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "glm-5.3", name: "GLM-5.3", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "kimi-k3", name: "Kimi-K3", contextLength: 1048576, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "kimi-k2.7-code", name: "Kimi-K2.7-Code", contextLength: 1048576, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "minimax-m3", name: "MiniMax-M3", contextLength: 1048576, toolCalling: true, supportsVision: true, supportsReasoning: true },
];

export const volcengine_coding_planProvider: RegistryEntry = {
  id: "volcengine-coding-plan",
  alias: "vecp",
  format: "openai",
  executor: "default",
  baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
  authType: "apikey",
  authHeader: "bearer",
  models: VOLCENGINE_CODING_PLAN_MODELS,
};
