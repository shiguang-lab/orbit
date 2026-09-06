export interface RegistryModel { [key: string]: unknown; id?: string; name?: string; }
export function getModelsByProviderId(providerId: string): RegistryModel[];
