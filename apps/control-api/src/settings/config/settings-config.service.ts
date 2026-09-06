import { Injectable } from "@nestjs/common";
import {
  backupDbFile,
  clearApiKeyCaches,
  getAllDomainBudgets,
  getAllDomainCostHistory,
  getAllUsageHistory,
  getCachedProviderNodes,
  getCombos,
  getDbInstance,
  getProviderConnections,
  getSettings,
  invalidateDbCache,
  runJsonMigration,
  updateSettings,
  type LegacyJsonData,
} from "@shiguang-gateway/core-domain/control/settings-config";
import {
  getModelsDevPricing,
  getSyncedCapabilities,
  getSyncStatus,
  startPeriodicSync,
  stopPeriodicSync,
  syncModelsDev,
} from "@shiguang-gateway/core-domain/catalog/synced-model-capabilities";
import { getApiKeys } from "@shiguang-gateway/core-domain/db/api-keys";
import { setSystemPromptConfig } from "@shiguang-gateway/open-sse/services/systemPrompt";
import {
  isFreeModel,
  providerHasFreeModels,
} from "@shiguang-gateway/core-domain/catalog/free-models";

const LEGACY_COMBO_RESILIENCE_KEYS = new Set([
  "timeoutMs",
  "healthCheckEnabled",
  "healthCheckTimeoutMs",
]);

const DEFAULT_COMBO_DEFAULTS = {
  strategy: "priority",
  maxRetries: 1,
  retryDelayMs: 2000,
  fallbackDelayMs: 0,
  handoffThreshold: 0.85,
  handoffModel: "",
  maxMessagesForSummary: 30,
  maxComboDepth: 3,
  trackMetrics: true,
  reasoningTokenBufferEnabled: true,
  zeroLatencyOptimizationsEnabled: false,
};

function sanitizeComboRuntimeConfig(config?: Record<string, unknown> | null): Record<string, unknown> {
  if (!config || typeof config !== "object") return {};
  return Object.fromEntries(
    Object.entries(config).filter(
      ([key, value]) =>
        value !== undefined && value !== null && !LEGACY_COMBO_RESILIENCE_KEYS.has(key),
    ),
  );
}

function sanitizeProviderOverrides(
  overrides?: Record<string, unknown> | null,
): Record<string, Record<string, unknown>> {
  if (!overrides || typeof overrides !== "object") return {};
  return Object.fromEntries(
    Object.entries(overrides).map(([providerId, config]) => [
      providerId,
      sanitizeComboRuntimeConfig(config as Record<string, unknown>),
    ]),
  );
}

function filterPaidComboSteps<T extends { models?: unknown }>(combos: T[]): T[] {
  return combos.map((combo) => {
    if (!Array.isArray(combo.models)) return combo;
    const filtered = combo.models.filter((step) => {
      if (!step || typeof step !== "object") return true;
      const record = step as Record<string, unknown>;
      if (record.kind === "combo-ref") return true;
      const rawModel = typeof record.model === "string" ? record.model.trim() : "";
      if (!rawModel) return true;
      const provider =
        (typeof record.providerId === "string" && record.providerId.trim()) ||
        (typeof record.provider === "string" && record.provider.trim()) ||
        (rawModel.includes("/") ? rawModel.split("/")[0] : "");
      if (!provider) return true;
      if (!providerHasFreeModels(provider)) return false;
      const modelId = rawModel.startsWith(`${provider}/`)
        ? rawModel.slice(provider.length + 1)
        : rawModel;
      return isFreeModel(provider, { id: modelId });
    });
    return { ...combo, models: filtered };
  });
}

@Injectable()
export class SettingsConfigService {
  getPersistedSettings() {
    return getSettings();
  }

  async exportJson(includeHistory: boolean): Promise<Record<string, unknown>> {
    const rawSettings = await getSettings();
    const { password: _password, requireLogin: _requireLogin, ...safeSettings } = rawSettings;
    const [providerConnections, providerNodes, combosRaw, apiKeys] = await Promise.all([
      Promise.resolve(getProviderConnections()),
      getCachedProviderNodes(),
      getCombos(),
      getApiKeys(),
    ]);
    const combos = rawSettings.hidePaidModels === true
      ? filterPaidComboSteps(combosRaw as Array<{ models?: unknown }>)
      : combosRaw;

    const exportData: Record<string, unknown> = {
      settings: safeSettings,
      providerConnections,
      providerNodes,
      combos,
      apiKeys,
      _meta: {
        exportedAt: new Date().toISOString(),
        version: "shiguangGateway-v3-legacy-export",
        includesHistory: includeHistory,
      },
    };
    if (includeHistory) {
      exportData.usageHistory = getAllUsageHistory();
      exportData.domainCostHistory = getAllDomainCostHistory();
      exportData.domainBudgets = getAllDomainBudgets();
    }
    return exportData;
  }

  async importJson(data: LegacyJsonData) {
    const safeData = data.settings
      ? (() => {
          const { password: _password, requireLogin: _requireLogin, ...settings } = data.settings!;
          return { ...data, settings };
        })()
      : data;
    backupDbFile("pre-json-import");
    const counts = runJsonMigration(getDbInstance(), safeData);
    clearApiKeyCaches();
    invalidateDbCache();
    const importedSettings = await getSettings();
    if (importedSettings.systemPrompt) setSystemPromptConfig(importedSettings.systemPrompt);
    return counts;
  }

  getComboDefaults(settings: Record<string, unknown>) {
    const comboDefaults = sanitizeComboRuntimeConfig(settings.comboDefaults as Record<string, unknown>);
    return {
      comboDefaults: Object.keys(comboDefaults).length > 0 ? comboDefaults : DEFAULT_COMBO_DEFAULTS,
      providerOverrides: sanitizeProviderOverrides(settings.providerOverrides as Record<string, unknown>),
    };
  }

  async updateComboDefaults(
    comboDefaults?: Record<string, unknown>,
    providerOverrides?: Record<string, unknown>,
  ) {
    const updates: Record<string, unknown> = {};
    if (comboDefaults) updates.comboDefaults = sanitizeComboRuntimeConfig(comboDefaults);
    if (providerOverrides) updates.providerOverrides = sanitizeProviderOverrides(providerOverrides);
    const settings = await updateSettings(updates) as Record<string, unknown>;
    return this.getComboDefaults(settings);
  }

  async getFaviconData() {
    const settings = await getSettings();
    return {
      base64: typeof settings.customFaviconBase64 === "string" ? settings.customFaviconBase64 : null,
      url: typeof settings.customFaviconUrl === "string" ? settings.customFaviconUrl : null,
    };
  }

  getModelsDevStatus() {
    const status = getSyncStatus();
    const pricing = getModelsDevPricing();
    const capabilities = getSyncedCapabilities();
    return {
      ...status,
      providerCount: Object.keys(pricing).length,
      modelCount: Object.values(pricing as Record<string, Record<string, unknown>>).reduce(
        (sum, models) => sum + Object.keys(models).length,
        0,
      ),
      capabilityCount: Object.values(capabilities as Record<string, Record<string, unknown>>).reduce(
        (sum, models) => sum + Object.keys(models).length,
        0,
      ),
    };
  }

  syncModelsDev(options: { dryRun?: boolean; syncCapabilities?: boolean }) {
    return syncModelsDev(options);
  }

  startModelsDevSync() {
    startPeriodicSync();
  }

  stopModelsDevSync() {
    stopPeriodicSync();
  }
}
