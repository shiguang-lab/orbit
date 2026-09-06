export interface SessionAccountAffinityRecord {
  connectionId: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export function getSessionAccountAffinity(
  sessionKey: string,
  provider: string,
  ttlMs?: number,
  now?: number,
): SessionAccountAffinityRecord | null;
export function upsertSessionAccountAffinity(
  sessionKey: string,
  provider: string,
  connectionId: string,
  now?: number,
  ttlMs?: number,
): void;
export function touchSessionAccountAffinity(
  sessionKey: string,
  provider: string,
  now?: number,
  ttlMs?: number,
): void;
export function deleteSessionAccountAffinity(sessionKey: string, provider: string): void;
export function evictSessionAccountAffinityForConnection(
  sessionKey: string,
  provider: string,
  connectionId: string,
): boolean;
