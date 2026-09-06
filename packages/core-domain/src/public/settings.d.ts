export function getSettings(): Promise<Record<string, unknown>>;
export function getCachedSettings(): Promise<Record<string, unknown>>;
export function updateSettings(patch: Record<string, unknown>): Promise<unknown>;
export function isCloudEnabled(): Promise<boolean>;
export { resolveProxyForConnection } from "../lib/db/settings.js";
