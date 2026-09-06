export type PaidModelTargetVerdict = "paid" | "free" | "unknown";
export function isPaidModelTarget(value: string): PaidModelTargetVerdict;
export function isFreeModel(provider: string, model: { id?: string; pricing?: { prompt?: string | number; completion?: string | number }; isFree?: boolean }): boolean;
export function providerHasFreeModels(providerId: string | undefined | null): boolean;
export const PROVIDERS_WITH_FREE_MODELS: Set<string>;
