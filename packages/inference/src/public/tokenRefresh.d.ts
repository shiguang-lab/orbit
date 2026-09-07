export interface ProviderRefreshCredentials {
  connectionId?: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  expiresIn?: number | null;
  idToken?: string | null;
  providerSpecificData?: Record<string, unknown> | null;
}

export interface CopilotRefreshResult {
  token?: string;
  expiresAt?: string | number;
}

export function getAccessToken(
  provider: string,
  credentials: ProviderRefreshCredentials,
  onPersist?: (result: Record<string, unknown>) => Promise<void>,
): Promise<Record<string, unknown> | null>;

export function refreshCopilotToken(
  githubAccessToken: string,
  credentials?: ProviderRefreshCredentials,
  baseUrl?: string,
): Promise<CopilotRefreshResult | null>;

export function refreshCodexToken(...args: any[]): Promise<any>;
export function isUnrecoverableRefreshError(error: unknown): boolean;
