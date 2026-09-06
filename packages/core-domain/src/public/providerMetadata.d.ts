export const AI_PROVIDERS: Record<string, { name?: string; [key: string]: unknown }>;
export function isOpenAICompatibleProvider(providerId: unknown): providerId is string;
export function isAnthropicCompatibleProvider(providerId: unknown): providerId is string;
export function isClaudeCodeCompatibleProvider(providerId: unknown): providerId is string;
export function providerAllowsOptionalApiKey(providerId: unknown): boolean;
export { supportsApiKeyOnFreeProvider } from "../shared/constants/providers.js";
