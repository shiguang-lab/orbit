/**
 * Provider identifiers used by open-sse executors.
 *
 * Keep this small execution-facing subset local to open-sse so the package does
 * not reach into core-domain source files (which would create a dependency
 * cycle: core-domain itself depends on open-sse).
 */

const LOCAL_PROVIDER_IDS = new Set([
  "mlx-gemma",
  "mlx-qwen",
  "ollama-local",
  "lm-studio",
  "vllm",
  "lemonade",
  "llamafile",
  "llama-cpp",
  "triton",
  "docker-model-runner",
  "xinference",
  "oobabooga",
  "sdwebui",
  "comfyui",
]);

const SELF_HOSTED_CHAT_PROVIDER_IDS = new Set([
  "mlx-gemma",
  "mlx-qwen",
  "ollama-local",
  "lm-studio",
  "vllm",
  "lemonade",
  "llamafile",
  "llama-cpp",
  "triton",
  "docker-model-runner",
  "xinference",
  "oobabooga",
]);

export function isLocalProvider(providerId: unknown): boolean {
  return typeof providerId === "string" && LOCAL_PROVIDER_IDS.has(providerId);
}

export function isSelfHostedChatProvider(providerId: unknown): boolean {
  return typeof providerId === "string" && SELF_HOSTED_CHAT_PROVIDER_IDS.has(providerId);
}
