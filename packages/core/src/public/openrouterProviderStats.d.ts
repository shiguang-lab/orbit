export interface ProviderPopularityEntry {
  slug: string;
  displayName: string;
  headquarters?: string;
  statusPageUrl?: string | null;
  byokEnabled?: boolean;
  dataPolicy?: {
    training?: boolean;
    retainsPrompts?: boolean;
    termsOfServiceURL?: string;
    privacyPolicyURL?: string;
  };
  iconUrl?: string;
  modelCount: number;
  totalTokens: number;
  totalRequests: number;
  popularityRank: number;
}

export function getOpenRouterProviderStats(): Promise<{
  data: ProviderPopularityEntry[];
  stale: boolean;
  cachedAt: string | null;
  fromCache: boolean;
}>;
export function refreshOpenRouterProviderStats(): Promise<{
  data: ProviderPopularityEntry[];
  ok: boolean;
  error?: string;
}>;
