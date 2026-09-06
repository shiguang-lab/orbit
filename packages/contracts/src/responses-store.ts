/**
 * OpenAI Responses persistence opt-in carried by a provider-specific data bag.
 *
 * This is deliberately a pure contract helper. Storage/session orchestration stays
 * in the owning application; callers only need to agree on the opt-in flag.
 */
export function isOpenAIResponsesStoreEnabled(providerSpecificData: unknown): boolean {
  if (!providerSpecificData || typeof providerSpecificData !== "object" || Array.isArray(providerSpecificData)) {
    return false;
  }
  return (providerSpecificData as Record<string, unknown>).openaiStoreEnabled === true;
}
