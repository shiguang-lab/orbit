export interface SearchHandlerOptions {
  query: string;
  provider: string;
  maxResults: number;
  searchType: string;
  country?: string;
  language?: string;
  timeRange?: string;
  offset?: number;
  domainFilter?: string[];
  contentOptions?: Record<string, unknown>;
  strictFilters?: boolean;
  providerOptions?: Record<string, unknown>;
  credentials: Record<string, unknown>;
  alternateProvider?: string;
  alternateCredentials?: Record<string, unknown> | null;
  log?: unknown;
  connectionId?: string;
  apiKeyId?: string;
}
export interface SearchResponse {
  provider: string;
  query: string;
  results: unknown[];
  answer: unknown;
  usage: { queries_used: number; search_cost_usd: number; llm_tokens?: number };
  metrics: Record<string, unknown>;
  errors: unknown[];
}
export class SearchBaseUrlOverrideError extends Error {
  readonly code: "SEARCH_BASE_URL_OVERRIDE_REFUSED";
}
export function handleSearch(options: SearchHandlerOptions): Promise<{ success: boolean; status?: number; error?: string; data?: SearchResponse }>;
