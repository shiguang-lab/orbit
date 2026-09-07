export type {
  ComboCooldownWaitSettings,
  RequestQueueSettings,
  ResilienceSettings,
  ResilienceSettingsPatch,
} from "../lib/resilience/settings/types.js";

import type {
  ResilienceSettings,
  ResilienceSettingsPatch,
} from "../lib/resilience/settings/types.js";

interface LegacyResilienceCompat {
  profiles: {
    oauth: {
      transientCooldown: number;
      rateLimitCooldown: number;
      maxBackoffLevel: number;
      circuitBreakerThreshold: number;
      degradationThreshold: number;
      circuitBreakerReset: number;
    };
    apikey: {
      transientCooldown: number;
      rateLimitCooldown: number;
      maxBackoffLevel: number;
      circuitBreakerThreshold: number;
      degradationThreshold: number;
      circuitBreakerReset: number;
    };
  };
  defaults: {
    requestsPerMinute: number;
    minTimeBetweenRequests: number;
    concurrentRequests: number;
  };
}

export const DEFAULT_RESILIENCE_SETTINGS: ResilienceSettings;
export function resolveResilienceSettings(
  settings: Record<string, unknown> | null | undefined,
): ResilienceSettings;
export function isStreamRecoveryExplicitlyConfigured(
  settings: Record<string, unknown> | null | undefined,
): boolean;
export function mergeResilienceSettings(
  current: ResilienceSettings,
  updates: ResilienceSettingsPatch,
): ResilienceSettings;
export function buildLegacyResilienceCompat(
  settings: ResilienceSettings,
): LegacyResilienceCompat;
