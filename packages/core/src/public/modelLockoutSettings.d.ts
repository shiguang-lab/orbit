export interface ModelLockoutSettings {
  enabled: boolean;
  errorCodes: number[];
  baseCooldownMs: number;
  maxCooldownMs: number;
  maxBackoffSteps: number;
  useExponentialBackoff: boolean;
}
export const DEFAULT_MODEL_LOCKOUT_SETTINGS: ModelLockoutSettings;
export function resolveModelLockoutSettings(
  settings: Record<string, unknown> | null | undefined,
): ModelLockoutSettings;
