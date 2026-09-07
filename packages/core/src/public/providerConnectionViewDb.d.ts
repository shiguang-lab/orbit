export interface ProviderConnectionView {
  id: string;
  provider: string;
  authType: string | null;
  email: string | null;
  isActive: boolean;
  rateLimitedUntil: string | null;
  testStatus: string | null;
  apiKey: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  expiresAt: string | null;
  projectId: string | null;
  defaultModel: string | null;
  providerSpecificData: Record<string, unknown>;
  lastUsedAt: string | null;
  consecutiveUseCount: number;
  priority: number;
  lastError: string | null;
  lastErrorType: string | null;
  lastErrorSource: string | null;
  errorCode: string | number | null;
  backoffLevel: number;
  maxConcurrent: number | null;
  quotaWindowThresholds: Record<string, number> | null;
}

export function toProviderConnection(value: unknown): ProviderConnectionView;
export function createLazyConnectionView(row: Record<string, unknown>): ProviderConnectionView;
