export type PaidModelTargetVerdict = "paid" | "free" | "unknown";
export function isPaidModelTarget(value: string): PaidModelTargetVerdict;
export function isFreeModel(provider: string, model: { id?: string; pricing?: { prompt?: string | number; completion?: string | number }; isFree?: boolean }): boolean;
export function providerHasFreeModels(providerId: string | undefined | null): boolean;
export const PROVIDERS_WITH_FREE_MODELS: Set<string>;
export interface FreeModelSummary {
  provider: string;
  modelId: string;
  displayName: string;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey?: string;
  tos?: string;
}
export function listFreeModels(): FreeModelSummary[];
