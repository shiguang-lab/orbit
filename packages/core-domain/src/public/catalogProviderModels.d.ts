export interface RegistryModel { [key: string]: unknown; id?: string; name?: string; }
export const PROVIDER_MODELS: Record<string, RegistryModel[]>;
export function getModelsByProviderId(providerId: string): RegistryModel[];
