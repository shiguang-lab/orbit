import { Injectable } from "@nestjs/common";
import {
  getPricing,
  getPricingWithSources,
  updatePricing,
  resetPricing,
  resetAllPricing,
} from "@orbit/core/pricing/db";
import { getDefaultPricing } from "@orbit/core/pricing/defaults";
import { getProviderPrefixIndex } from "@orbit/core/pricing/provider-prefixes";
import { getAllCustomModels, getAllSyncedAvailableModels } from "@orbit/core/db/models";
import {
  syncPricingFromSources,
  getSyncStatus,
  clearSyncedPricing,
} from "@orbit/core/pricing/sync";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asModelArray(value: unknown): Array<{ id?: string; name?: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Array<{
    id?: string;
    name?: string;
  }>;
}

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class PricingService {
  async getPricing(includeSources: boolean = false) {
    if (includeSources) {
      return getPricingWithSources();
    }
    return getPricing();
  }

  async updatePricing(body: Record<string, any>) {
    return updatePricing(body);
  }

  async resetPricing(provider?: string, model?: string) {
    if (provider && model) {
      await resetPricing(provider, model);
    } else if (provider) {
      await resetPricing(provider);
    } else {
      await resetAllPricing();
    }
    return getPricing();
  }

  getDefaultPricing() {
    return getDefaultPricing();
  }

  async getModelsCatalog() {
    const catalog: Record<string, any> = {};
    const { REGISTRY } = await load(
      "@orbit/inference/config/providerRegistry",
    );
    const registry = REGISTRY as Record<string, any>;

    const { nodeToPrefix, prefixToNode, eligibleNodeIds, compatibleNodeIds } =
      await getProviderPrefixIndex();

    for (const entry of Object.values(registry)) {
      const alias = entry.alias || entry.id;
      if (!entry.models || entry.models.length === 0) continue;

      catalog[alias] = {
        id: entry.id,
        alias,
        name: entry.id.charAt(0).toUpperCase() + entry.id.slice(1),
        authType: entry.authType || "unknown",
        format: entry.format || "openai",
        models: entry.models.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          custom: false,
        })),
      };
    }

    const resolveAlias = (providerId: string) => {
      for (const entry of Object.values(registry)) {
        if (entry.id === providerId) return entry.alias || entry.id;
      }
      return providerId;
    };

    const ensureCatalogProvider = (providerId: string, alias: string) => {
      if (!catalog[alias]) {
        catalog[alias] = {
          id: providerId,
          alias,
          name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
          authType: "unknown",
          format: "openai",
          models: [],
        };
        const prefix = nodeToPrefix.get(providerId);
        if (prefix) catalog[alias].displayPrefix = prefix;
        if (compatibleNodeIds.has(providerId)) {
          catalog[alias].modelOverrideEligible = eligibleNodeIds.has(providerId);
        }
      }
      return catalog[alias];
    };

    const appendDbModels = (providerId: string, rawModels: unknown) => {
      const models = asModelArray(rawModels);
      const alias = resolveAlias(providerId);
      const providerCatalog = ensureCatalogProvider(providerId, alias);
      const existingIds = new Set(providerCatalog.models.map((m: any) => m.id));

      for (const model of models) {
        const modelId = typeof model.id === "string" ? model.id : null;
        if (!modelId || existingIds.has(modelId)) continue;
        providerCatalog.models.push({
          id: modelId,
          name: typeof model.name === "string" && model.name.trim() ? model.name : modelId,
          custom: true,
        });
        existingIds.add(modelId);
      }
    };

    let syncedModelsMap: Record<string, unknown> = {};
    try {
      syncedModelsMap = asRecord(await getAllSyncedAvailableModels());
    } catch {
      /* DB may not be ready */
    }

    for (const [providerId, rawModels] of Object.entries(syncedModelsMap)) {
      appendDbModels(providerId, rawModels);
    }

    let customModelsMap: Record<string, unknown> = {};
    try {
      customModelsMap = asRecord(await getAllCustomModels());
    } catch {
      /* DB may not be ready */
    }
    for (const [providerId, rawModels] of Object.entries(customModelsMap)) {
      const alias = resolveAlias(providerId);
      const providerCatalog = ensureCatalogProvider(providerId, alias);
      for (const model of asModelArray(rawModels)) {
        const modelId = typeof model.id === "string" ? model.id : null;
        if (!modelId) continue;
        const customModel = {
          id: modelId,
          name: typeof model.name === "string" && model.name.trim() ? model.name : modelId,
          custom: true,
        };
        const existingIndex = providerCatalog.models.findIndex(
          (entry: { id?: string }) => entry.id === modelId
        );
        if (existingIndex === -1) providerCatalog.models.push(customModel);
        else providerCatalog.models[existingIndex] = customModel;
      }
    }

    let pricingData: Record<string, any> = {};
    try {
      pricingData = await getPricing();
    } catch {
      /* DB may not be ready */
    }

    for (const [rawProviderAlias, models] of Object.entries(pricingData)) {
      const pricingKey = rawProviderAlias;
      const providerAlias = prefixToNode.get(rawProviderAlias) || rawProviderAlias;
      if (!catalog[providerAlias]) {
        catalog[providerAlias] = {
          id: providerAlias,
          alias: providerAlias,
          name: providerAlias.charAt(0).toUpperCase() + providerAlias.slice(1),
          authType: "unknown",
          format: "openai",
          models: [],
        };
        const prefix = nodeToPrefix.get(providerAlias);
        if (prefix) catalog[providerAlias].displayPrefix = prefix;
        if (compatibleNodeIds.has(providerAlias)) {
          catalog[providerAlias].modelOverrideEligible = eligibleNodeIds.has(providerAlias);
        }
      }
      if (pricingKey !== providerAlias && !catalog[providerAlias].pricingKey) {
        catalog[providerAlias].pricingKey = pricingKey;
      }

      const existingIds = new Set(catalog[providerAlias].models.map((m: any) => m.id));
      for (const modelId of Object.keys(models)) {
        if (!existingIds.has(modelId)) {
          catalog[providerAlias].models.push({
            id: modelId,
            name: modelId,
            custom: true,
          });
          existingIds.add(modelId);
        }
      }
    }

    for (const entry of Object.values(catalog)) {
      entry.modelCount = entry.models.length;
    }

    return catalog;
  }

  async syncPricing(sources?: "litellm"[], dryRun: boolean = false) {
    return syncPricingFromSources({ sources, dryRun });
  }

  getSyncStatus() {
    return getSyncStatus();
  }

  clearSyncedPricing() {
    clearSyncedPricing();
    return { success: true, message: "Synced pricing data cleared" };
  }
}
