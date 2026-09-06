function envInt(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function resolveProviderProfiles(env: Record<string, string | undefined>) {
  return {
  oauth: {
    transientCooldown: 5000,
    rateLimitCooldown: 60000,
    maxBackoffLevel: 8,
    circuitBreakerThreshold: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_OAUTH_THRESHOLD", 8),
    circuitBreakerReset: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_OAUTH_RESET_MS", 60000),
    providerFailureThreshold: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_FAILURE_THRESHOLD", 10),
    providerFailureWindowMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_FAILURE_WINDOW_MS", 900000),
    providerCooldownMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_COOLDOWN_MS", 300000),
    degradationThreshold: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_DEGRADATION_THRESHOLD", 5),
    maxBackoffMultiplier: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_MAX_BACKOFF_MULTIPLIER", 8),
    backoffEscalationCount: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_OAUTH_BACKOFF_ESCALATION_COUNT", 2),
  },
  apikey: {
    transientCooldown: 3000,
    rateLimitCooldown: 0,
    maxBackoffLevel: 5,
    circuitBreakerThreshold: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_API_KEY_THRESHOLD", 12),
    circuitBreakerReset: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_API_KEY_RESET_MS", 30000),
    providerFailureThreshold: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_FAILURE_THRESHOLD", 15),
    providerFailureWindowMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_FAILURE_WINDOW_MS", 1800000),
    providerCooldownMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_COOLDOWN_MS", 600000),
    degradationThreshold: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_DEGRADATION_THRESHOLD", 7),
    maxBackoffMultiplier: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_MAX_BACKOFF_MULTIPLIER", 4),
    backoffEscalationCount: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_API_KEY_BACKOFF_ESCALATION_COUNT", 3),
  },
  local: {
    transientCooldown: 2000,
    rateLimitCooldown: 5000,
    maxBackoffLevel: 3,
    circuitBreakerThreshold: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_LOCAL_THRESHOLD", 2),
    circuitBreakerReset: envInt(env, "SHIGUANG_GATEWAY_CIRCUIT_BREAKER_LOCAL_RESET_MS", 15000),
    providerFailureThreshold: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_LOCAL_FAILURE_THRESHOLD", 2),
    providerFailureWindowMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_LOCAL_FAILURE_WINDOW_MS", 300000),
    providerCooldownMs: envInt(env, "SHIGUANG_GATEWAY_PROVIDER_BREAKER_LOCAL_COOLDOWN_MS", 60000),
  },
  };
}

export const DEFAULT_API_LIMITS = {
  requestsPerMinute: 60,
  minTimeBetweenRequests: 350,
  concurrentRequests: 6,
} as const;

export const STREAM_THROUGHPUT_WATCHDOG = {
  WARMUP_MS: 30_000,
  WINDOW_MS: 30_000,
  MIN_USEFUL_BYTES_PER_SECOND: 4,
  MIN_USEFUL_BYTES: 1,
} as const;
