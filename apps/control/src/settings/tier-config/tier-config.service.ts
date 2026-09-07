import { Injectable } from "@nestjs/common";
import {
  loadTierConfig,
  saveTierConfig,
} from "@orbit/core/db/tier-config";
import type { TierConfig } from "@orbit/contracts/tier-types";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";

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

  async updateProviderOverride({ provider, tier }: TierOverrideUpdate): Promise<TierConfig> {
    const config = loadTierConfig();
    const providerOverrides = config.providerOverrides.filter(
      (override: TierConfig["providerOverrides"][number]) =>
        override.provider.toLowerCase() !== provider.toLowerCase(),
    );
    if (tier !== null) providerOverrides.push({ provider, tier });

    const nextConfig: TierConfig = { ...config, providerOverrides };
    saveTierConfig(nextConfig);
    await executeEdgeRuntimeCommand({ command: "tier-config.apply" });
    return nextConfig;
  }
}
