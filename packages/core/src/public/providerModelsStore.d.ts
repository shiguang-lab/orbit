export interface ModelCompatPatch {
  normalizeToolCallId?: boolean;
  preserveOpenAIDeveloperRole?: boolean | null;
  upstreamHeaders?: Record<string, unknown> | null;
  compatByProtocol?: Record<string, unknown>;
  apiFormat?: string | null;
  targetFormat?: string | null;
  supportsVision?: boolean | null;
  isHidden?: boolean;
}

export function getCustomModels(providerId: string): Promise<Array<Record<string, unknown>>>;
export function getCustomModels(): Promise<Record<string, unknown>>;
export function getAllCustomModels(): Promise<Record<string, unknown>>;
export function addCustomModel(...args: any[]): Promise<Record<string, unknown>>;
export function removeCustomModel(providerId: string, modelId: string): Promise<boolean>;
export function replaceCustomModels(...args: any[]): Promise<unknown>;
export function deleteSyncedAvailableModelsForProvider(providerId: string): Promise<number>;
export function removeSyncedAvailableModel(providerId: string, modelId: string): Promise<boolean>;
export function updateCustomModel(
  providerId: string,
  modelId: string,
  updates?: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;
export function getModelCompatOverrides(providerId: string): Array<Record<string, unknown>>;
export function mergeModelCompatOverride(
  providerId: string,
  modelId: string,
  patch: ModelCompatPatch,
): unknown;
export function getHiddenModelsByProvider(): Map<string, Set<string>>;
