export interface FreeModelCandidate { id?: string; pricing?: { prompt?: string | number; completion?: string | number }; isFree?: boolean; }
export function providerHasFreeModels(providerId: string | undefined | null): boolean;
export function isFreeModel(provider: string, model: FreeModelCandidate): boolean;
