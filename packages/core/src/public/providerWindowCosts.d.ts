export interface ProviderWindowCostBreakdownOptions { provider: string; connectionId?: string | null; now?: number; }
export function getProviderWindowCostBreakdown(options: ProviderWindowCostBreakdownOptions): Promise<unknown>;
