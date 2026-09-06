export interface ProviderValidationResult {
  valid: boolean;
  error?: string | null;
  warning?: string | null;
  method?: string | null;
  [key: string]: unknown;
}

export function validateProviderApiKey(input: {
  provider: string;
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}): Promise<ProviderValidationResult & Record<string, unknown>>;

export function validateClaudeCodeCompatibleProvider(input: {
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}): Promise<ProviderValidationResult>;
