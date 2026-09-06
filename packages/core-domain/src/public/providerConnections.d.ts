export interface ProviderConnectionSummary {
  provider?: unknown;
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
export function getProviderConnectionById(id: string): Promise<ProviderConnectionSummary | null>;
export function createProviderConnection(data: Record<string, unknown>): Promise<{ id?: unknown } | null>;
export function getProviderConnectionById(id: string): Promise<Record<string, unknown> | null>;
export function updateProviderConnection(
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;
export function deleteProviderConnectionsByProvider(providerId: string): Promise<unknown>;
