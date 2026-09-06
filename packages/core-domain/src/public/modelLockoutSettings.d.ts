export interface ModelLockoutSettings {
  enabled: boolean;
  errorCodes: number[];
  baseCooldownMs: number;
  maxCooldownMs: number;
  maxBackoffSteps: number;
  useExponentialBackoff: boolean;
}
export function resolveModelLockoutSettings(
  settings: Record<string, unknown> | null | undefined,
): ModelLockoutSettings;
