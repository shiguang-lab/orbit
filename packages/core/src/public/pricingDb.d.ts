export type PricingSource = 'default' | 'litellm' | 'modelsDev' | 'user';
export type PricingSourceMap = Record<string, Record<string, PricingSource>>;

export function getPricing(): Promise<Record<string, any>>;
export function getPricingWithSources(): Promise<{
  pricing: Record<string, any>;
  sourceMap: PricingSourceMap;
}>;
export function getPricingForModel(provider: string, model: string): Promise<Record<string, unknown> | null>;
export function updatePricing(pricingData: Record<string, any>): Promise<Record<string, any>>;
export function resetPricing(provider: string, model?: string): Promise<Record<string, unknown>>;
export function resetAllPricing(): Promise<Record<string, unknown>>;
