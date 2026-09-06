export function getSettings(): Promise<Record<string, unknown>>;
export function getSettingsRevision(): Promise<number>;
export function getCachedSettings(): Promise<Record<string, unknown>>;
export function updateSettings(
  patch: Record<string, unknown>,
  options?: { expectedRevision?: number },
): Promise<Record<string, unknown>>;
export function isCloudEnabled(): Promise<boolean>;
export { resolveProxyForConnection } from "../lib/db/settings.js";
export class SettingsRevisionConflictError extends Error {
  readonly code: "SETTINGS_REVISION_CONFLICT";
  readonly currentRevision: number;
}
