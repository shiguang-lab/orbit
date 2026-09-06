export type FetchInterceptionBackend = "firecrawl" | "jina" | "tavily";

export interface ModelInterceptionRule {
  interceptSearch?: boolean;
  interceptFetch?: boolean;
  fetchBackend?: FetchInterceptionBackend;
  fetchProxyUrl?: string;
}

export interface ProviderInterceptionRules {
  interceptSearch?: boolean;
  interceptFetch?: boolean;
  fetchBackend?: FetchInterceptionBackend;
  fetchProxyUrl?: string;
  models?: Record<string, ModelInterceptionRule>;
}

export function getInterceptionRules(provider: string): ProviderInterceptionRules | null;
export function setInterceptionRules(provider: string, rules: ProviderInterceptionRules): void;
export function deleteInterceptionRules(provider: string): void;
