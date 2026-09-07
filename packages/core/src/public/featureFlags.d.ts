export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  descriptionI18nKey: string;
  category: "security" | "network" | "policies" | "runtime" | "cli" | "health";
  defaultValue: string;
  type: "boolean" | "enum";
  enumValues?: string[];
  requiresRestart: boolean;
  warningLevel?: "info" | "caution" | "danger";
}
export declare const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[];
export function resolveFeatureFlag(key: string): string;
export function resolveAllFeatureFlags(): Array<{
  key: string;
  effectiveValue: string;
  source: "db" | "env" | "default";
  definition: FeatureFlagDefinition;
}>;
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
export function getFeatureFlagOverrides(): Record<string, string>;
export function setFeatureFlagOverride(key: string, value: string): void;
export function removeFeatureFlagOverride(key: string): void;
export function clearAllFeatureFlagOverrides(): void;
export function getCcAliasGlobalState(): { enabled: boolean; source: "env" | "db" | "default" };
export const ADAPTIVE_VIRTUAL_LANES_FLAG_KEY: string;
export function resolveAdaptiveVirtualLanesFlag(): {
  enabled: boolean;
  source: "env" | "db" | "default";
};
