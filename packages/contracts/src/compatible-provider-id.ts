/**
 * Identifies connection IDs generated for OpenAI- and Anthropic-compatible
 * provider nodes. This is a transport-neutral value contract shared by edge
 * routing and the provider catalog; it intentionally has no database/runtime
 * dependencies.
 */
const COMPATIBLE_PROVIDER_ID_PATTERN = /^(?:openai-compatible-(?:chat|responses)-|anthropic-compatible-(?:cc-)?)[0-9a-f-]+$/i;

/**
 * True when `providerId` matches one of the generated compatible-provider
 * connection ID shapes.
 */
export function isCompatibleProviderConnectionId(providerId: string | null | undefined): boolean {
  return typeof providerId === "string" && COMPATIBLE_PROVIDER_ID_PATTERN.test(providerId);
}
