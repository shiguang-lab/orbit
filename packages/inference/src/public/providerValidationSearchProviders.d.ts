export const SEARCH_VALIDATOR_CONFIGS: Record<
  string,
  (apiKey: string, providerSpecificData?: unknown) => { url: string; init: RequestInit }
>;
