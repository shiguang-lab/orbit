export type WebFetchFormat = "markdown" | "html" | "links" | "screenshot";
export interface WebFetchRequest {
  url: string;
  provider?: "firecrawl" | "jina-reader" | "tavily-search" | "tinyfish" | "context7" | "nimble-search" | "anysearch-search";
  format?: WebFetchFormat;
  depth?: 0 | 1 | 2;
  wait_for_selector?: string;
  include_metadata?: boolean;
}
export interface WebFetchResponse {
  provider: string;
  url: string;
  content: string;
  links: string[];
  metadata: { title: string | null; description: string | null; truncated?: boolean } | null;
  screenshot_url: string | null;
}
export interface WebFetchResult {
  success: boolean;
  status?: number;
  error?: string;
  data?: WebFetchResponse;
}
export interface WebFetchCredentials {
  apiKey?: string;
  baseUrl?: string;
  providerSpecificData?: Record<string, unknown>;
}
export declare const WEB_FETCH_PROVIDERS: readonly ["firecrawl", "jina-reader", "tavily-search", "tinyfish", "anysearch-search", "context7", "nimble-search"];
export type WebFetchProviderId = (typeof WEB_FETCH_PROVIDERS)[number];
export declare const EXPLICIT_ONLY_WEB_FETCH_PROVIDERS: ReadonlySet<WebFetchProviderId>;
export declare const ANONYMOUS_CAPABLE_WEB_FETCH_PROVIDERS: ReadonlySet<WebFetchProviderId>;
export declare function handleWebFetch(req: WebFetchRequest, credentials: WebFetchCredentials, resolvedProvider?: WebFetchProviderId): Promise<WebFetchResult>;
