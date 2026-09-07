export type ObsidianSyncStatus = { vaultPath: string | null; webdavEnabled: boolean; webdavUsername: string | null; webdavPassword: string | null };
export type ObsidianSyncEnableResult = { success: true; vaultPath: string; username: string; password: string } | { success: false; error: string };
export declare function getObsidianSyncStatus(): Promise<ObsidianSyncStatus>;
export declare function enableObsidianVaultSync(vaultPath: string): Promise<ObsidianSyncEnableResult>;
export declare function disableObsidianVaultSync(): Promise<{ success: boolean; error?: string }>;
