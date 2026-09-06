export function getSettings(): Promise<Record<string, unknown>>;
export function getSettingsRevision(): Promise<number>;
export function getCachedSettings(): Promise<Record<string, unknown>>;
export function updateSettings(
  patch: Record<string, unknown>,
  options?: { expectedRevision?: number },
): Promise<Record<string, unknown>>;
export function isCloudEnabled(): Promise<boolean>;
export function resolveProxyForConnection(
  connectionId: string,
  apiKeyId?: string,
  providerId?: string,
): Promise<unknown | null>;
export class SettingsRevisionConflictError extends Error {
  readonly code: "SETTINGS_REVISION_CONFLICT";
  readonly currentRevision: number;
}
