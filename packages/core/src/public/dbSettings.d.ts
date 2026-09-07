export type Settings = Record<string, unknown>;
export type ProxyValue = Record<string, unknown> | string | null;

export interface ResolvedProxy {
  proxy: ProxyValue;
  level: string;
  levelId: string | null;
  source?: string;
}

export class SettingsRevisionConflictError extends Error {
  constructor(currentRevision: number);
  readonly code: "SETTINGS_REVISION_CONFLICT";
  readonly currentRevision: number;
}

export function getSettings(): Promise<Settings>;
export function getSettingsRevision(): Promise<number>;
export function getCachedSettings(): Promise<Settings>;
export function updateSettings(
  patch: Record<string, unknown>,
  options?: { expectedRevision?: number; applyRuntime?: boolean },
): Promise<Settings>;
export function isCloudEnabled(): Promise<boolean>;
export function resolveProxyForConnection(
  connectionId: string,
  apiKeyId?: string,
  providerId?: string,
): Promise<ResolvedProxy>;
export function getPricingForModel(
  provider: string,
  model: string,
): Promise<Record<string, unknown> | null>;
