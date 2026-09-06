export interface TierConfig {
  version: string;
  defaults: {
    freeThreshold: number;
    cheapThreshold: number;
  };
  providerOverrides: Array<{
    provider: string;
    tier: "free" | "cheap" | "premium";
  }>;
  modelOverrides: Array<{
    provider: string;
    modelPattern: string;
    tier: "free" | "cheap" | "premium";
  }>;
  freeProviders: string[];
}

export function initTierConfigTable(): void;
export function loadTierConfig(): TierConfig;
export function loadTierConfigFromDb(): TierConfig | null;
export function saveTierConfig(config: TierConfig): void;
