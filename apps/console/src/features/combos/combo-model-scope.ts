interface ProviderScope {
  providerId: string;
  prefix?: string | null;
  models?: Array<{ id: string; qualifiedModel: string }>;
}

export function getComboProviderScope(providerId: string, providers: ProviderScope[]): string {
  return providers.find((provider) => provider.providerId === providerId)?.prefix || providerId;
}

export function getComboModelLabel(model: string, providerId: string | null | undefined, providers: ProviderScope[]): string {
  if (!providerId) return model;
  const scope = getComboProviderScope(providerId, providers);
  if (model.startsWith(providerId + "/")) return scope + model.slice(providerId.length);
  if (model.startsWith(scope + "/")) return model;
  return model.includes("/") ? model : scope + "/" + model;
}

export function getSelectedComboModel(providerId: string, modelId: string, providers: ProviderScope[]): string {
  const provider = providers.find((item) => item.providerId === providerId);
  return provider?.models?.find((model) => model.id === modelId)?.qualifiedModel
    || getComboModelLabel(modelId, providerId, providers);
}
