export function extractApiKey(request: unknown, opts?: { allowUrl?: boolean }): string | null;
export function isValidApiKey(apiKey: string): Promise<boolean>;
export function getProviderCredentialsWithQuotaPreflight(
  provider: string,
  excludeConnectionId?: string | null,
  allowedConnections?: string[] | null,
  requestedModel?: string | null,
  options?: Record<string, unknown>,
): Promise<any>;
export function getProviderCredentials(provider: string, ...args: any[]): Promise<any>;
export function clearRecoveredProviderState(
  credentials: unknown,
  expectedState?: Record<string, unknown>,
): Promise<{ applied: boolean }>;
