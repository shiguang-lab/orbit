/** Compatibility facade; catalog ownership lives in @orbit/providers. */
export { KIMI_CODE_CLI_PLATFORM, KIMI_CODE_CLI_VERSION, KIMI_CODING_ANTHROPIC_URL, KIMI_CODING_BASE_URL, KIMI_CODING_MODELS_URL, KIMI_CODING_OPENAI_URL, buildKimiCodeIdentityHeaders, getKimiCodeCliUserAgent, getKimiCodeCliVersion, getKimiCodeStaticThinkingPolicy, normalizeKimiDeviceId, sanitizeKimiHeaderValue } from "@orbit/providers/providers/registry/kimi/coding/runtime";
export type { KimiCodeDeviceIdentity, KimiCodeThinkingPolicy } from "@orbit/providers/providers/registry/kimi/coding/runtime";
