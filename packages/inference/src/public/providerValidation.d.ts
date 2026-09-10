export interface ProviderValidationResult {
  valid: boolean;
  error?: string | null;
  warning?: string | null;
  method?: string | null;
  statusCode?: number | null;
  unsupported?: boolean;
  securityBlocked?: boolean;
  [key: string]: unknown;
}

export function projectProviderValidationResultForPublicResponse<
  T extends { error?: unknown; warning?: unknown },
>(result: T): T & { error?: string | null; warning?: string | null };

export function validateProviderApiKey(input: {
  provider: string;
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}): Promise<ProviderValidationResult>;

export function validateClaudeCodeCompatibleProvider(input: {
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}): Promise<ProviderValidationResult>;
