interface RateLimitRule {
  limit: number;
  window: number;
}

export interface ApiKeyMetadata {
  id: string;
  name?: string;
  modelAccessMode?: "all" | "restricted";
  allowedModels?: string[];
  blockedModels?: string[];
  allowedCombos?: string[];
  allowedConnections?: string[];
  allowedQuotas?: string[];
  noLog?: boolean;
  autoResolve?: boolean;
  budget?: number;
  usedBudget?: number;
  isActive?: boolean;
  isBanned?: boolean;
  expiresAt?: string | null;
  accessSchedule?: {
    enabled: boolean;
    from: string;
    until: string;
    days: number[];
    tz: string;
  } | null;
  maxRequestsPerDay?: number | null;
  maxRequestsPerMinute?: number | null;
  throttleDelayMs?: number | null;
  maxSessions?: number | null;
  rateLimits?: RateLimitRule[] | null;
  scopes?: string[];
  allowedEndpoints?: string[];
  disableNonPublicModels?: boolean;
  allowUsageCommand?: boolean;
  usageLimitEnabled?: boolean;
  dailyUsageLimitUsd?: number | null;
  weeklyUsageLimitUsd?: number | null;
  compressionEnabled?: boolean;
}
export interface ApiKeyPolicyResult {
  apiKey: string | null;
  apiKeyInfo: ApiKeyMetadata | null;
  rejection: Response | null;
}
export function enforceApiKeyPolicy(request: Request, modelStr: string | null, effort?: string): Promise<ApiKeyPolicyResult>;
export function validateApiKeyRoutingTarget(
  request: Request,
  apiKey: string | null,
  apiKeyInfo: ApiKeyMetadata | null,
  modelStr: string | null,
): Promise<Response | null>;
