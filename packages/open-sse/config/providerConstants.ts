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

// Aliases needed by the audio registry's model-prefix parser. These providers
// are intentionally not part of open-sse's chat registry, so resolve the
// small execution-facing map locally instead of importing core-domain data.
const PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  deepgram: "dg",
  assemblyai: "aai",
  soniox: "sx",
  elevenlabs: "el",
  "aws-polly": "polly",
  "rev-ai": "revai",
  speechmatics: "sm",
};

export function isLocalProvider(providerId: unknown): boolean {
  return typeof providerId === "string" && LOCAL_PROVIDER_IDS.has(providerId);
}

export function isSelfHostedChatProvider(providerId: unknown): boolean {
  return typeof providerId === "string" && SELF_HOSTED_CHAT_PROVIDER_IDS.has(providerId);
}

export function getProviderAlias(providerId: string): string {
  return PROVIDER_ALIASES[providerId] || providerId;
}
