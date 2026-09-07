type PaidModelTargetVerdict = "paid" | "free" | "unknown";
interface FreeModelCandidate {
  id?: string;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  isFree?: boolean;
}
interface FreeModelSummary {
  provider: string;
  modelId: string;
  displayName: string;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey?: string;
  tos?: string;
}

export function isPaidModelTarget(value: string): PaidModelTargetVerdict;
export function isFreeModel(provider: string, model: FreeModelCandidate): boolean;
export function providerHasFreeModels(providerId: string | undefined | null): boolean;
export function listFreeModels(): FreeModelSummary[];
export function selectModelsForImport<T extends FreeModelCandidate>(
  provider: string,
  fetchedModels: T[],
  importFreeOnly: boolean,
): { models: T[]; freeFilterEmpty: boolean };
