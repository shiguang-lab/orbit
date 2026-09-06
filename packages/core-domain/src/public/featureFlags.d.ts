export function resolveFeatureFlag(key: string): string;
export function isFeatureFlagEnabled(key: string): boolean;
export function isRequireApiKeyEnabled(): boolean;
export function isCcCompatibleProviderEnabled(): boolean;
export function areContextWindowChecksDisabled(): boolean;
export function isApiKeyRevealEnabledFlag(): boolean;
export function isModelCatalogNamesEnabled(): boolean;
export function getModelsCatalogPrefixMode(): "dual" | "alias" | "canonical";
export function isArenaEloSyncEnabled(): boolean;
export function isControlPlaneProxyDirectFallbackEnabled(): boolean;
export function isNetworkRotationSharedEgressGuardEnabled(): boolean;

