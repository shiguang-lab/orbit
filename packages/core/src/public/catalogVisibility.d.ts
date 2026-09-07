export type CatalogVisibilitySetting = "on" | "off";
export interface CatalogVisibilitySettings {
  providers: Map<string, CatalogVisibilitySetting>;
  models: Map<string, CatalogVisibilitySetting>;
}
export interface CatalogVisibilitySnapshot extends CatalogVisibilitySettings { global: boolean }
export function isCcAliasGlobalEnabled(): boolean;
export function getCcAliasSettingsBulk(): CatalogVisibilitySettings;
export function isFunctionalGatewayGlobalEnabled(): boolean;
export function getFunctionalGatewaySettingsBulk(): CatalogVisibilitySettings;
export function buildCcAliasPredicate(snapshot: CatalogVisibilitySnapshot): (entry: { id?: unknown; owned_by?: unknown }) => boolean;
export function buildFunctionalGatewayPredicate(snapshot: CatalogVisibilitySnapshot): (entry: { id?: unknown; owned_by?: unknown }) => boolean;
