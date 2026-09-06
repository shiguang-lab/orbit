export interface AliasMaps {
  aliasToProviderId: Record<string, string>;
  providerIdToAlias: Record<string, string>;
}
export function buildAliasMaps(): AliasMaps;
export function resolveCanonicalProviderId(
  aliasToProviderId: Record<string, string>,
  aliasOrId: string,
  fallbackProviderId?: string,
): string;
export function getComboTargetModelId(
  maps: AliasMaps,
  target: { modelStr?: string; provider?: string | null; providerId?: string | null },
): { providerId: string; modelId: string } | null;
