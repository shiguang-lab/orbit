export const ALIBABA_PROVIDER_REGION_VALUES: readonly ["global-sg", "china-beijing"];
export type AlibabaProviderRegion = (typeof ALIBABA_PROVIDER_REGION_VALUES)[number];
export type AlibabaProviderFamily =
  | "alibaba"
  | "bailian-coding-plan"
  | "qwen-cloud"
  | "qwen-cloud-token-plan";
export const ALIBABA_PROVIDER_ENDPOINTS: Readonly<
  Record<AlibabaProviderFamily, Readonly<Record<AlibabaProviderRegion, string>>>
>;
export function isAlibabaRegionalProvider(providerId: string | null | undefined): boolean;
export function getDefaultAlibabaProviderRegion(
  providerId: string | null | undefined,
): AlibabaProviderRegion;
export function normalizeAlibabaProviderRegion(
  value: unknown,
  fallback?: AlibabaProviderRegion,
): AlibabaProviderRegion;
export function resolveAlibabaProviderRegion(
  providerId: string,
  providerSpecificData?: unknown,
): AlibabaProviderRegion;
export function resolveAlibabaProviderBaseUrl(
  providerId: string,
  providerSpecificData?: unknown,
  fallback?: string,
): string;
export function resolveAlibabaProviderModelsUrl(
  providerId: string,
  providerSpecificData?: unknown,
  fallback?: string,
): string;
export function resolveAlibabaProviderMediaBaseUrl(
  providerId: string,
  providerSpecificData?: unknown,
  fallback?: string,
): string;
