interface ApiKeyRecord {
  [field: string]: unknown;
  id?: string;
  name?: string;
  key?: string;
  machineId?: string | null;
  isActive?: boolean;
  revokedAt?: string | null;
  isBanned?: boolean;
  scopes?: string[];
  allowedConnections?: string[];
  allowedQuotas?: string[];
  allowedModels?: string[];
  noLog?: boolean;
  allowUsageCommand?: boolean;
  usageLimitEnabled?: boolean;
  dailyUsageLimitUsd?: number | null;
  weeklyUsageLimitUsd?: number | null;
  chaosModeEnabled?: boolean;
}

interface ApiKeyMetadata {
  id: string;
  name: string;
  machineId: string | null;
  modelAccessMode: "all" | "restricted";
  allowedModels: string[];
  blockedModels: string[];
  allowedCombos: string[];
  allowedConnections: string[];
  allowedQuotas: string[];
  noLog: boolean;
  autoResolve: boolean;
  isActive: boolean;
  accessSchedule: { enabled: boolean; from: string; until: string; days: number[]; tz: string } | null;
  maxRequestsPerDay: number | null;
  maxRequestsPerMinute: number | null;
  throttleDelayMs: number | null;
  rateLimits: Array<{ limit: number; window: number }> | null;
  maxSessions: number;
  revokedAt: string | null;
  expiresAt: string | null;
  ipAllowlist: string[];
  scopes: string[];
  isBanned: boolean;
  keyHash: string | null;
  proxyId: string | null;
  allowedEndpoints: string[];
  streamDefaultMode: "legacy" | "json";
  cacheDefaultMode: "legacy" | "bypass";
  disableNonPublicModels: boolean;
  allowUsageCommand: boolean;
  usageLimitEnabled: boolean;
  dailyUsageLimitUsd: number | null;
  weeklyUsageLimitUsd: number | null;
  chaosModeEnabled: boolean;
  compressionEnabled: boolean;
}

export class ApiKeyPolicyInvariantError extends Error {
  readonly code: "LEASE_KEY_POLICY_INVALID";
}
export function getApiKeys(limit?: number, offset?: number): Promise<ApiKeyRecord[]>;
export function getApiKeysCount(): number;
export function getExclusiveLeaseConnectionIds(): Promise<Set<string>>;
export function pickApiKeyForInternalUse(
  purpose?: "combo-health-check" | "cloud-sync-verify" | "internal-probe",
): Promise<string | null>;
export function getApiKeyById(id: string): Promise<ApiKeyRecord | null>;
export function createApiKey(
  name: string,
  machineId: string,
  scopes?: string[],
  options?: { allowedConnections?: string[] },
): Promise<ApiKeyRecord & { id: string; name: string; key: string; machineId: string }>;
export function regenerateApiKey(id: string): Promise<{ id: string; key: string } | null>;
export function updateApiKeyPermissions(
  id: string,
  update: string[] | Record<string, unknown>,
): Promise<boolean>;
export function deleteApiKey(id: string): Promise<boolean>;
export function revokeApiKey(id: string): Promise<boolean>;
export function validateApiKey(key: string | null | undefined): Promise<boolean>;
export function getApiKeyMetadata(
  key: string | null | undefined,
): Promise<ApiKeyMetadata | null>;
export function isModelAllowedForKey(
  key: string | null | undefined,
  modelId: string | null | undefined,
  effort?: string,
): Promise<boolean>;
