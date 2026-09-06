export function getSettings(): Promise<Record<string, unknown>>;
export function updateSettings(patch: Record<string, unknown>): Promise<unknown>;
export function isCloudEnabled(): Promise<boolean>;
export function resolveProxyForConnection(
  connectionId: string,
  apiKeyId?: string,
  providerId?: string,
): Promise<Record<string, unknown> | null>;
