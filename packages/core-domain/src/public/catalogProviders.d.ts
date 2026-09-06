export interface ProviderCatalogEntry {
  id: string;
  alias?: string;
  name?: string;
  icon?: string;
  color?: string;
  passthroughModels?: boolean;
  hasFree?: boolean;
  [key: string]: unknown;
}

export const AI_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const NOAUTH_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const OAUTH_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const APIKEY_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const LOCAL_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const UPSTREAM_PROXY_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const WEB_COOKIE_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const SEARCH_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const AUDIO_ONLY_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const CLOUD_AGENT_PROVIDERS: Record<string, ProviderCatalogEntry>;
export const IDE_PROVIDER_IDS: ReadonlySet<string>;
export const OPENAI_COMPATIBLE_PREFIX: string;
export const ANTHROPIC_COMPATIBLE_PREFIX: string;
export const CLAUDE_CODE_COMPATIBLE_PREFIX: string;
export function getProviderConnectionFamilyIds(providerId: unknown): readonly string[];
export const USAGE_SUPPORTED_PROVIDERS: readonly string[];
export function isAnthropicCompatibleProvider(providerId: unknown): providerId is string;
export function isClaudeCodeCompatibleProvider(providerId: unknown): providerId is string;
export function isOpenAICompatibleProvider(providerId: unknown): providerId is string;
export function isLocalProvider(providerId: unknown): boolean;
export function isSelfHostedChatProvider(providerId: unknown): boolean;
export function providerAllowsOptionalApiKey(providerId: unknown): boolean;
export function supportsApiKeyOnFreeProvider(providerId: unknown): boolean;
export function resolveProviderId(aliasOrId: string): string;
export function getProviderAlias(providerId: string): string;
export function getProviderById(id: string): ProviderCatalogEntry | undefined;
export function getProviderByAlias(alias: string): ProviderCatalogEntry | null;
