export interface SyncedModelRecord { [key: string]: unknown; }
export function getSyncedAvailableModels(provider: string): Promise<SyncedModelRecord[]>;
export function getAllSyncedAvailableModels(): Promise<Record<string, unknown>>;
export function getAllCustomModels(): Promise<Record<string, unknown>>;
