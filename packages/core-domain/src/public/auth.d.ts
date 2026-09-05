export function extractApiKey(request: unknown, opts?: { allowUrl?: boolean }): string | null;
export function isValidApiKey(apiKey: string): Promise<boolean>;
export function getProviderCredentialsWithQuotaPreflight(provider: string): Promise<any>;
export function clearRecoveredProviderState(provider: string): Promise<void>;
