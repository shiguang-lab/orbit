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
  { id: "doubao-seed-2.0-code", name: "Doubao Seed 2.0 Code (Coding Plan)", contextLength: 262144, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "doubao-seed-2.0-pro", name: "Doubao Seed 2.0 Pro (Coding Plan)", contextLength: 262144, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "doubao-seed-2.0-lite", name: "Doubao Seed 2.0 Lite (Coding Plan)", contextLength: 262144, toolCalling: true, supportsReasoning: true },
  { id: "doubao-seed-code", name: "Doubao Seed Code (Coding Plan)", contextLength: 262144, toolCalling: true, supportsReasoning: true },
  { id: "minimax-m2.5", name: "MiniMax M2.5 (Coding Plan)", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "glm-4.7", name: "GLM 4.7 (Coding Plan)", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "deepseek-v3.2", name: "DeepSeek V3.2 (Coding Plan)", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
  { id: "kimi-k2.5", name: "Kimi K2.5 (Coding Plan)", contextLength: 1048576, toolCalling: true, supportsVision: true, supportsReasoning: true },
  { id: "ark-code-latest", name: "Ark Code Latest (Coding Plan)", contextLength: 1048576, toolCalling: true, supportsReasoning: true },
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
