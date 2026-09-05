export function deleteManagedAvailableModelAliases(
  providerId: string,
  modelIds: string[],
): Promise<string[]>;
export function deleteManagedAvailableModelAliasesForProvider(providerId: string): Promise<string[]>;
export function syncManagedAvailableModelAliases(
  providerId: string,
  modelIds: string[],
  options?: { pruneMissing?: boolean },
): Promise<{ assignedAliases: string[]; removedAliases: string[]; storagePrefix: string }>;
