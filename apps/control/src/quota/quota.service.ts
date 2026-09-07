import { Injectable } from "@nestjs/common";
import {
  listGroups,
  createGroup,
  renameGroup,
  deleteGroup,
  getGroup,
  getPoolsByGroup,
  getApiKeyById,
  getCombos,
  listProviderPlans,
  getProviderPlan,
  upsertProviderPlan,
  deleteProviderPlan,
  listPools,
  createPool,
  ensurePool,
  getPool,
  updatePool,
  deletePool,
  listConsumptionForPool,
} from "@orbit/core/quota/db";
import {
  knownProviders,
  getKnownPlan,
  resolvePlan,
  resolveConnectionProvider,
  resolveQuotaKeyScope,
  filterModelsToQuotaPools,
  syncQuotaCombos,
  removeQuotaCombosForPool,
  reconcilePoolExclusivity,
  getQuotaStore,
  enforceQuotaShare,
  type PoolUsageSnapshot,
} from "@orbit/core/quota/services";

@Injectable()
export class QuotaService {
  listGroups() {
    return listGroups();
  }

  createGroup(name: string) {
    return createGroup(name);
  }

  async renameGroup(id: string, name: string) {
    const updated = renameGroup(id, name);
    if (!updated) return null;

    const pools = getPoolsByGroup(id);
    for (const pool of pools) {
      try {
        await syncQuotaCombos(pool.id);
      } catch (err: any) {
        console.warn("[quota-groups] syncQuotaCombos failed (non-fatal):", err?.message);
      }
    }

    return getGroup(id);
  }

  deleteGroup(id: string) {
    return deleteGroup(id);
  }

  async getKeyModels(id: string) {
    const key = await getApiKeyById(id);
    if (!key) return null;

    const allowedQuotas: string[] = Array.isArray(key.allowedQuotas)
      ? (key.allowedQuotas as string[])
      : [];

    const scope = await resolveQuotaKeyScope(allowedQuotas);

    let allCombos: any[] = [];
    try {
      allCombos = await getCombos();
    } catch {
      /* ignore */
    }

    const candidates = allCombos
      .filter((c) => typeof c.name === "string" && c.name.length > 0)
      .map((c) => ({ id: c.name as string }));

    return filterModelsToQuotaPools(candidates, scope.poolSlugs).map((m) => m.id);
  }

  listPlans() {
    const catalogPlans = knownProviders().map((provider) => {
      const known = getKnownPlan(provider);
      return {
        connectionId: null,
        provider,
        dimensions: known?.dimensions ?? [],
        source: "auto" as const,
      };
    });

    const dbPlans = listProviderPlans();
    const dbByProvider = new Map(dbPlans.map((p) => [p.provider, p]));
    const merged = catalogPlans.map((catalog) => {
      const override = dbByProvider.get(catalog.provider);
      if (override) {
        dbByProvider.delete(catalog.provider);
        return override;
      }
      return catalog;
    });

    for (const dbPlan of dbByProvider.values()) {
      merged.push(dbPlan);
    }

    return merged;
  }

  async getPlan(connectionId: string) {
    const dbPlan = getProviderPlan(connectionId);
    if (dbPlan) return dbPlan;

    const provider = await resolveConnectionProvider(connectionId);
    return resolvePlan(connectionId, provider);
  }

  async upsertPlan(connectionId: string, dimensions: any[]) {
    const provider = await resolveConnectionProvider(connectionId);
    upsertProviderPlan(connectionId, provider, dimensions, "manual");
    return { plan: getProviderPlan(connectionId), provider };
  }

  async deletePlan(connectionId: string) {
    const existing = getProviderPlan(connectionId);
    const provider = existing?.provider ?? (await resolveConnectionProvider(connectionId));
    deleteProviderPlan(connectionId);
    return { provider };
  }

  listPools(limit?: number, offset?: number) {
    return listPools(limit !== undefined ? { limit, offset: offset || 0 } : undefined);
  }

  createPool(data: any, ensure?: boolean) {
    const ensured = ensure ? ensurePool(data) : null;
    const pool = ensured?.pool ?? createPool(data);
    return { pool, ensured };
  }

  getPool(id: string) {
    return getPool(id);
  }

  async updatePool(id: string, data: any, exclusivePresent: boolean, combosNeedResync: boolean) {
    const prevApiKeyIds: string[] = [];
    if (exclusivePresent) {
      const existingPool = getPool(id);
      if (existingPool) {
        for (const alloc of existingPool.allocations) {
          prevApiKeyIds.push(alloc.apiKeyId);
        }
      }
    }

    if (combosNeedResync) {
      try {
        await removeQuotaCombosForPool(id);
      } catch {
        /* ignore */
      }
    }

    const pool = updatePool(id, data);
    if (!pool) return null;

    if (combosNeedResync) {
      try {
        await syncQuotaCombos(id);
      } catch {
        /* ignore */
      }
    }

    if (exclusivePresent) {
      const nextApiKeyIds = (data.allocations ?? []).map((a: any) => a.apiKeyId);
      await reconcilePoolExclusivity(
        id,
        prevApiKeyIds,
        nextApiKeyIds,
        data.exclusive ?? false
      );
    }

    return pool;
  }

  async deletePool(id: string) {
    return deletePool(id);
  }

  listPoolLog(id: string, limit?: number) {
    const parsedLimit = limit && Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50;
    return listConsumptionForPool(id, parsedLimit);
  }

  async getPoolUsage(id: string): Promise<PoolUsageSnapshot | null> {
    const pool = getPool(id);
    if (!pool) return null;

    const provider = await resolveConnectionProvider(pool.connectionId);
    const plan = resolvePlan(pool.connectionId, provider);

    const accountCount =
      Array.isArray(pool.connectionIds) && pool.connectionIds.length > 0
        ? pool.connectionIds.length
        : 1;
    const effectiveDimensions = plan.dimensions.map((dim: any) => ({
      ...dim,
      limit: dim.limit * accountCount,
    }));

    const store = await getQuotaStore();
    if (effectiveDimensions.length > 0) {
      return store.poolUsageWithDimensions(id, effectiveDimensions);
    }
    return store.poolUsage(id);
  }

  async preview(data: {
    apiKeyId: string;
    poolId: string;
    estimatedTokens?: number;
    estimatedUsd?: number;
    estimatedRequests?: number;
  }) {
    const { apiKeyId, poolId, estimatedTokens, estimatedUsd, estimatedRequests } = data;
    const pool = getPool(poolId);
    if (!pool) return null;

    return enforceQuotaShare({
      apiKeyId,
      connectionId: pool.connectionId,
      provider: "",
      estimatedCost: {
        tokens: estimatedTokens,
        usd: estimatedUsd,
        requests: estimatedRequests,
      },
    });
  }
}
