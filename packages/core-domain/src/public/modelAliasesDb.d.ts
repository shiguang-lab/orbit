export type ProviderAliasMap = Record<string, string>;

export function getModelAliases(): Promise<Record<string, unknown>>;
export function setModelAlias(alias: string, model: unknown): Promise<void>;
export function deleteModelAlias(alias: string): Promise<void>;
export function deleteModelAliasesForProvider(providerId: string): Promise<string[]>;
export function getProviderAliases(providerId: string): ProviderAliasMap;
export function setProviderAlias(
  providerId: string,
  alias: string,
  upstreamModelId: string,
): void;
export function removeProviderAlias(providerId: string, alias: string): void;
