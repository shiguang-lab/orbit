export interface SyncedModelRecord { [key: string]: unknown; }
export function getSyncedAvailableModels(provider: string): Promise<SyncedModelRecord[]>;
export function getAllSyncedAvailableModels(): Promise<Record<string, unknown>>;
export function getAllCustomModels(): Promise<Record<string, unknown>>;
export function getCustomModels(providerId?: string): Promise<Array<Record<string, unknown>>>;
export function setModelIsHidden(providerId: string, modelId: string, hidden: boolean): void;
export function getModelIsHidden(providerId: string, modelId: string): boolean;
