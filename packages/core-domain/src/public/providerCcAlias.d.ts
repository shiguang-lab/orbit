export type CcAliasSetting = "on" | "off" | null;

export function getCcAliasProviderSetting(providerId: string): CcAliasSetting;
export function setCcAliasProviderSetting(providerId: string, value: CcAliasSetting): void;
export function setCcAliasModelSetting(
  providerId: string,
  modelId: string,
  value: CcAliasSetting,
): void;
export function getCcAliasSettingsBulk(): {
  providers: Map<string, "on" | "off">;
  models: Map<string, "on" | "off">;
};
