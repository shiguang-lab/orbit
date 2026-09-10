export interface FreeProviderRankingOptions {
  configuredOnly?: boolean;
  availableOnly?: boolean;
  withUsage?: boolean;
  usageRange?: "1h" | "24h" | "7d" | "30d";
  sortBy?: "elo" | "reliability";
}

export function computeFreeProviderRankings(
  category?: string,
  limit?: number,
  options?: FreeProviderRankingOptions,
): Promise<unknown[]>;
