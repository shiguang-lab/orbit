/**
 * Public provider-catalog contract.
 *
 * Keep this boundary narrower than the internal provider constants module so
 * package consumers cannot grow dependencies on implementation-only exports.
 */
export {
  AI_PROVIDERS,
  NOAUTH_PROVIDERS,
  OAUTH_PROVIDERS,
  APIKEY_PROVIDERS,
  LOCAL_PROVIDERS,
  UPSTREAM_PROXY_PROVIDERS,
  WEB_COOKIE_PROVIDERS,
  SEARCH_PROVIDERS,
  AUDIO_ONLY_PROVIDERS,
  CLOUD_AGENT_PROVIDERS,
  IDE_PROVIDER_IDS,
  OPENAI_COMPATIBLE_PREFIX,
  ANTHROPIC_COMPATIBLE_PREFIX,
  CLAUDE_CODE_COMPATIBLE_PREFIX,
  USAGE_SUPPORTED_PROVIDERS,
  getProviderConnectionFamilyIds,
  isAnthropicCompatibleProvider,
  isClaudeCodeCompatibleProvider,
  isOpenAICompatibleProvider,
  providerAllowsOptionalApiKey,
  resolveProviderId,
  getProviderById,
  getProviderByAlias,
  supportsApiKeyOnFreeProvider,
  isSelfHostedChatProvider,
  isLocalProvider,
  getProviderAlias,
} from "../shared/constants/providers.js";
