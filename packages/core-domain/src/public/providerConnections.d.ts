export interface ProviderConnectionSummary {
  isActive?: boolean;
  refreshToken?: string | null;
  testStatus?: string | null;
  lastError?: string | null;
  lastErrorType?: string | null;
  lastHealthCheckAt?: string | null;
  [key: string]: unknown;
}

export function getProviderConnections(
  filter?: Record<string, unknown>,
  limit?: number,
  offset?: number,
): ProviderConnectionSummary[];
export function updateProviderConnection(
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;
export function deleteProviderConnectionsByProvider(providerId: string): Promise<unknown>;
