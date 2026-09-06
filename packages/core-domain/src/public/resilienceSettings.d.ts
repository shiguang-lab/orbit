export type ComboCooldownWaitSettings = Record<string, any>;
export type RequestQueueSettings = Record<string, any>;
export type ResilienceSettings = Record<string, any>;
export const DEFAULT_RESILIENCE_SETTINGS: ResilienceSettings;
export function resolveResilienceSettings(
  settings: Record<string, unknown> | null | undefined,
): ResilienceSettings;
export function isStreamRecoveryExplicitlyConfigured(
  settings: Record<string, unknown> | null | undefined,
): boolean;
