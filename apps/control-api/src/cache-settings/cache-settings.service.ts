import { Injectable } from "@nestjs/common";
import {
  getDatabaseSettings,
  updateDatabaseSettings,
} from "@shiguang-gateway/core-domain/control/database-settings";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
import { getCacheMetrics, resetCacheMetrics } from "@shiguang-gateway/core-domain/cache/services";
import { clearAllLKGP } from "@shiguang-gateway/core-domain/control/lkgp-cache";

const CACHE_CONFIG_KEYS = [
  "semanticCacheEnabled",
  "semanticCacheMaxSize",
  "semanticCacheTTL",
  "promptCacheEnabled",
  "promptCacheStrategy",
  "alwaysPreserveClientCache",
  "idempotencyWindowMs",
  "modelCatalogCacheTtlMs",
] as const;

const DEFAULTS = {
  semanticCacheEnabled: true,
  semanticCacheMaxSize: 100,
  semanticCacheTTL: 1_800_000,
  promptCacheEnabled: true,
  promptCacheStrategy: "auto",
  alwaysPreserveClientCache: "auto",
  idempotencyWindowMs: 5_000,
  modelCatalogCacheTtlMs: 60_000,
} as const;

@Injectable()
export class CacheSettingsService {
  async getConfig(): Promise<Record<string, unknown>> {
    const dbSettings = getDatabaseSettings() as { cache?: Record<string, unknown> };
    const cache = dbSettings.cache ?? {};
    const flatSettings = await getSettings();
    const config: Record<string, unknown> = {};
    for (const key of CACHE_CONFIG_KEYS) {
      config[key] =
        key === "idempotencyWindowMs"
          ? flatSettings[key] ?? DEFAULTS[key]
          : cache[key] ?? DEFAULTS[key];
    }
    return config;
  }

  async updateConfig(updates: Record<string, unknown>): Promise<void> {
    const databaseUpdates: Record<string, unknown> = { ...updates };
    delete databaseUpdates.idempotencyWindowMs;
    if (Object.keys(databaseUpdates).length > 0) {
      updateDatabaseSettings({ cache: databaseUpdates });
    }
    if (updates.idempotencyWindowMs !== undefined) {
      await updateSettings({ idempotencyWindowMs: updates.idempotencyWindowMs });
    }
  }

  getMetrics() {
    return getCacheMetrics();
  }

  resetMetrics() {
    return resetCacheMetrics();
  }

  clearLkgp() {
    clearAllLKGP();
  }
}
