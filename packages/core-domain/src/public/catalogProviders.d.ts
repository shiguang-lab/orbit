export const AI_PROVIDERS: Record<string, { id: string; alias?: string; icon?: string; color?: string; passthroughModels?: boolean }>;
export const NOAUTH_PROVIDERS: Record<string, { id: string; alias?: string }>;
export function isAnthropicCompatibleProvider(providerId: unknown): providerId is string;
export function isClaudeCodeCompatibleProvider(providerId: unknown): providerId is string;
export function isOpenAICompatibleProvider(providerId: unknown): providerId is string;
