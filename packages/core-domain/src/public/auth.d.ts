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
export function extractSessionAffinityKey(
  body: unknown,
  headers?: Headers | { get?: (name: string) => string | null } | null,
): string | null;
export function isAgentrouterConnectionQuotaScope(
  provider: string | null | undefined,
  fallbackResult: {
    ruleScope?: "model" | "provider" | "connection";
    reason?: string;
    permanent?: boolean;
    creditsExhausted?: boolean;
  },
): boolean;
export function markAccountUnavailable(
  connectionId: string,
  status: number,
  errorText: string,
  provider?: string | null,
  model?: string | null,
  providerProfile?: unknown,
  options?: {
    persistUnavailableState?: boolean;
    isCombo?: boolean;
    headers?: Headers | Record<string, string> | null;
  },
): Promise<unknown>;
