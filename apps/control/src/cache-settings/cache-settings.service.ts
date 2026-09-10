import { Injectable } from "@nestjs/common";
import {
  getDatabaseSettings,
  updateDatabaseSettings,
} from "@orbit/core/db/database-settings";
import { getSettings } from "@orbit/core/db/settings";
import { updatePersistedRuntimeSettings } from "../settings/runtime-settings-persistence.js";
import { getCacheMetrics, resetCacheMetrics } from "@orbit/core/cache/services";
import { clearAllLKGP } from "@orbit/core/control/lkgp-cache";

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
      if (key === "idempotencyWindowMs" || key === "alwaysPreserveClientCache") {
        // These live in the flat general settings: idempotencyLayer and the
        // runtime-settings snapshot both read from there, so reporting the
        // databaseSettings "cache" copy would show a value the runtime never uses.
        config[key] = flatSettings[key] ?? DEFAULTS[key];
      } else {
        config[key] = cache[key] ?? DEFAULTS[key];
      }
    }
    return config;
  }

  async updateConfig(updates: Record<string, unknown>): Promise<void> {
    // idempotencyWindowMs and alwaysPreserveClientCache are read from the flat
    // general settings (see getConfig) — persisting them into the databaseSettings
    // "cache" section would be a silent no-op for the runtime, which is what made
    // alwaysPreserveClientCache writes ineffective before (#12304).
    const databaseUpdates: Record<string, unknown> = { ...updates };
    delete databaseUpdates.idempotencyWindowMs;
    delete databaseUpdates.alwaysPreserveClientCache;
    if (Object.keys(databaseUpdates).length > 0) {
      updateDatabaseSettings({
        cache: databaseUpdates as NonNullable<
          Parameters<typeof updateDatabaseSettings>[0]["cache"]
        >,
      });
    }
    const flatUpdates: Record<string, unknown> = {};
    if (updates.idempotencyWindowMs !== undefined) {
      flatUpdates.idempotencyWindowMs = updates.idempotencyWindowMs;
    }
    if (updates.alwaysPreserveClientCache !== undefined) {
      flatUpdates.alwaysPreserveClientCache = updates.alwaysPreserveClientCache;
    }
    if (Object.keys(flatUpdates).length > 0) {
      await updatePersistedRuntimeSettings(flatUpdates);
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
