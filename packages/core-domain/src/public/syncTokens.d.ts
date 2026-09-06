export interface SyncTokenRecord {
  id: string;
  name: string;
  tokenHash: string;
  syncApiKeyId: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export function issueSyncToken(params: { name: string; syncApiKeyId?: string | null }): Promise<{ token: string; record: SyncTokenRecord }>;
export function validateSyncToken(rawToken: string | null | undefined): Promise<SyncTokenRecord | null>;
export function markSyncTokenUsed(record: SyncTokenRecord): Promise<void>;
export function listSyncTokenSummaries(): Promise<Array<Omit<SyncTokenRecord, "tokenHash">>>;
export function revokeSyncTokenById(id: string): Promise<Omit<SyncTokenRecord, "tokenHash"> | null>;
export function resolveSyncApiKeyIdFromManagementRequest(request: Request): Promise<string | null>;
export function getSyncTokenFromRequest(request: Request): string | null;
