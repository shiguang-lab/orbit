export interface SearchProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  method: "GET" | "POST";
  authType: "apikey" | "none";
  authHeader: string;
  costPerQuery: number;
  freeMonthlyQuota: number;
  searchTypes: string[];
  defaultMaxResults: number;
  maxMaxResults: number;
  timeoutMs: number;
  cacheTTLMs: number;
  fallbackOnly?: boolean;
  disabled?: boolean;
  allowClientBaseUrlOverride?: boolean;
}

export const SEARCH_PROVIDERS: Record<string, SearchProviderConfig>;
export function getSearchCredentialFallbacks(providerId: string): string[];
export function resolveSearchProviderId(providerId: string): string;
export function isUnconfiguredLoopbackSearchProvider(provider: SearchProviderConfig | null | undefined): boolean;
export function getSearchProvider(providerId: string): SearchProviderConfig | null;
export function resolveSearchProvider(providerId: string): SearchProviderConfig | null;
export function supportsSearchType(providerOrId: SearchProviderConfig | string | null | undefined, searchType: string): boolean;
export function getAllSearchProviders(blockedProviders?: string[]): Array<{ id: string; name: string; searchTypes: string[] }>;
export function selectProvider(explicitProvider?: string, searchType?: string): SearchProviderConfig | null;
