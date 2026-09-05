import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import bundledCatalog from "../lib/static-catalog.json" with { type: "json" };
import bundledModels from "../lib/static-models.json" with { type: "json" };

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

export const pricingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/pricing
  app.get("/pricing", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const includeSources = query.includeSources === "1" || query.includeSources === "true";

      const { getPricing, getPricingWithSources } = await import("@/lib/localDb");

      if (includeSources) {
        const result = await getPricingWithSources();
        return reply.send(result);
      }

      const pricing = await getPricing();
      return reply.send(pricing);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch pricing" });
    }
  });

  // PATCH /api/pricing
  app.patch("/pricing", async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      if (!body || typeof body !== "object") {
        return reply.status(400).send({ error: "Invalid JSON body" });
      }

      const { updatePricing } = await import("@/lib/localDb");
      const updatedPricing = await updatePricing(body);
      return reply.send(updatedPricing);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to update pricing" });
    }
  });

  // DELETE /api/pricing
  app.delete("/pricing", async (request, reply) => {
    try {
      const query = request.query as { provider?: string; model?: string };
      const { provider, model } = query || {};

      const { resetPricing, resetAllPricing, getPricing } = await import("@/lib/localDb");

      if (provider && model) {
        await resetPricing(provider, model);
      } else if (provider) {
        await resetPricing(provider);
      } else {
        await resetAllPricing();
      }

      const pricing = await getPricing();
      return reply.send(pricing);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to reset pricing" });
    }
  });

  // GET /api/pricing/models
  app.get("/pricing/models", async (_request, reply) => {
    try {
      const { getAllCustomModels, getAllSyncedAvailableModels, getPricing } = await import("@/lib/localDb");

      const catalog: Record<string, any> = {};

      // 1. Seed from bundled static-catalog and bundled static-models
      const categories = (bundledCatalog as any)?.categories || [];
      for (const cat of categories) {
        const providers = cat?.providers || [];
        for (const p of providers) {
          const alias = p.id;
          const staticM = (bundledModels as Record<string, any>)[p.id] || [];
          catalog[alias] = {
            id: p.id,
            alias,
            name: p.name || p.id.charAt(0).toUpperCase() + p.id.slice(1),
            authType: cat.key || "unknown",
            format: p.apiType || "openai",
            models: staticM.map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
              custom: false,
            })),
          };
        }
      }

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
        }
        return catalog[alias];
      };

      const appendDbModels = (providerId: string, rawModels: unknown) => {
        const models = asModelArray(rawModels);
        const alias = providerId;
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

      // 2. Synced available models (DB)
      let syncedModelsMap: Record<string, unknown> = {};
      try {
        syncedModelsMap = asRecord(await getAllSyncedAvailableModels());
      } catch {}

      for (const [providerId, rawModels] of Object.entries(syncedModelsMap)) {
        appendDbModels(providerId, rawModels);
      }

      // 3. Custom models (DB)
      let customModelsMap: Record<string, unknown> = {};
      try {
        customModelsMap = asRecord(await getAllCustomModels());
      } catch {}

      for (const [providerId, rawModels] of Object.entries(customModelsMap)) {
        const alias = providerId;
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

      // 4. Pricing-only models
      let pricingData: Record<string, any> = {};
      try {
        pricingData = await getPricing();
      } catch {}

      for (const [rawProviderAlias, models] of Object.entries(pricingData)) {
        const pricingKey = rawProviderAlias;
        const providerAlias = rawProviderAlias;
        if (!catalog[providerAlias]) {
          catalog[providerAlias] = {
            id: providerAlias,
            alias: providerAlias,
            name: providerAlias.charAt(0).toUpperCase() + providerAlias.slice(1),
            authType: "unknown",
            format: "openai",
            models: [],
          };
        }
        if (pricingKey !== providerAlias && !catalog[providerAlias].pricingKey) {
          catalog[providerAlias].pricingKey = pricingKey;
        }

        const existingIds = new Set(catalog[providerAlias].models.map((m: any) => m.id));
        if (models && typeof models === "object") {
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
      }

      for (const entry of Object.values(catalog)) {
        entry.modelCount = entry.models.length;
      }

      return reply.send(catalog);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch pricing models catalog" });
    }
  });

  // GET /api/pricing/sync
  app.get("/pricing/sync", async (_request, reply) => {
    try {
      const { getSyncStatus } = await import("@/lib/pricingSync");
      return reply.send(getSyncStatus());
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to fetch pricing sync status" });
    }
  });

  // POST /api/pricing/sync
  app.post("/pricing/sync", async (request, reply) => {
    try {
      const body = (request.body as { sources?: string[]; dryRun?: boolean }) || {};
      const { sources, dryRun = false } = body;
      const { syncPricingFromSources } = await import("@/lib/pricingSync");
      const result = await syncPricingFromSources({ sources, dryRun });
      return reply.status(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to sync pricing" });
    }
  });

  // DELETE /api/pricing/sync
  app.delete("/pricing/sync", async (_request, reply) => {
    try {
      const { clearSyncedPricing } = await import("@/lib/pricingSync");
      clearSyncedPricing();
      return reply.send({ success: true, message: "Synced pricing data cleared" });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to clear synced pricing" });
    }
  });
};
