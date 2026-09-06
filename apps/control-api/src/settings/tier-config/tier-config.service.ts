import { Injectable } from "@nestjs/common";
import {
  loadTierConfig,
  saveTierConfig,
  type TierConfig,
} from "@shiguang-gateway/core-domain/control/tier-config";
import { setTierConfig } from "@shiguang-gateway/open-sse/services/tier-resolver";

export interface TierOverrideUpdate {
  provider: string;
  tier: "free" | "cheap" | "premium" | null;
}

/** Use cases for operator-managed provider routing tiers. */
@Injectable()
export class TierConfigService {
  getConfig(): TierConfig {
    return loadTierConfig();
  }

  updateProviderOverride({ provider, tier }: TierOverrideUpdate): TierConfig {
    const config = loadTierConfig();
    const providerOverrides = config.providerOverrides.filter(
      (override) => override.provider.toLowerCase() !== provider.toLowerCase(),
    );
    if (tier !== null) providerOverrides.push({ provider, tier });

    const nextConfig: TierConfig = { ...config, providerOverrides };
    saveTierConfig(nextConfig);
    // Keep the in-process routing cache in sync for requests handled by this
    // process. Other app processes reload the same persisted row on startup.
    setTierConfig(nextConfig);
    return nextConfig;
  }
}
