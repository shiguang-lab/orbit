import type { TierAssignment, TierConfig, ProviderTier } from "../services/tierTypes";

export function setTierConfig(config?: Partial<TierConfig> | null): void;
export function getTierConfig(): TierConfig;
export function clearTierCache(): void;
export function classifyTier(provider: string, model: string): TierAssignment;
export function classifyTiers(
  targets: Array<{ provider: string; model: string }>,
): TierAssignment[];
export function getTierStats(): Record<ProviderTier, number>;
