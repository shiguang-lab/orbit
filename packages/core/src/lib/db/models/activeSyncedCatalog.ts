import { providerUsesAuthoritativeLiveCatalog } from "@orbit/providers/provider-registry";
import { PROVIDER_ID_TO_ALIAS } from "@orbit/providers/provider-models";
import {
  getCustomModels,
  getSyncedAvailableModels,
  getSyncedAvailableModelsByConnection,
  type SyncedAvailableModel,
} from "../models";
import { normalizeSyncedAvailableModels } from "./synced";
import { getRawProviderConnections } from "../providers";

export type ActiveSyncedCatalog = {
  authoritative: boolean;
  models: SyncedAvailableModel[];
};

/** Fail-open membership check against an authoritative active live catalog. */
export function catalogContainsModel(
  catalog: ActiveSyncedCatalog,
  modelId: string
): boolean | null {
  if (!catalog.authoritative) return null;
  const normalized = modelId.trim();
  if (!normalized) return false;
  const ids = new Set(catalog.models.map((model) => model.id));
  if (ids.has(normalized)) return true;
  const slash = normalized.indexOf("/");
  return slash > 0 && ids.has(normalized.slice(slash + 1));
}

export type ProviderCatalogReconciliation = {
  providers: string[];
  excludedProviders: string[];
};

type ProviderConnectionRef = {
  id: string;
  provider: string;
};

function resolveStoredProviderId(aliasOrId: string): string {
  const normalized = aliasOrId.trim();
  if (!normalized) return "";

  if (Object.prototype.hasOwnProperty.call(PROVIDER_ID_TO_ALIAS, normalized)) {
    return normalized;
  }

  for (const [providerId, alias] of Object.entries(PROVIDER_ID_TO_ALIAS)) {
    if (alias === normalized) return providerId;
  }

  return normalized;
}

const CATALOG_SIBLING_IDS: Record<string, string[]> = {
  antigravity: ["agy"],
  agy: ["antigravity"],
};

function catalogLookupIds(providerId: string): string[] {
  return [providerId, ...(CATALOG_SIBLING_IDS[providerId] || [])];
}

function unionModels(groups: SyncedAvailableModel[][]): SyncedAvailableModel[] {
  const merged = new Map<string, SyncedAvailableModel>();
  for (const group of groups) {
    for (const model of group) if (model?.id && !merged.has(model.id)) merged.set(model.id, model);
  }
  return Array.from(merged.values());
}

function readConnectionRef(connection: unknown): ProviderConnectionRef | null {
  if (!connection || typeof connection !== "object") return null;

  const record = connection as {
    id?: unknown;
    provider?: unknown;
  };

  if (
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    typeof record.provider !== "string" ||
    record.provider.length === 0
  ) {
    return null;
  }

  return {
    id: record.id,
    provider: record.provider,
  };
}

function collectModelsForConnections(
  modelsByConnection: Record<string, SyncedAvailableModel[]>,
  connectionIds: Iterable<string>
): SyncedAvailableModel[] {
  const models = new Map<string, SyncedAvailableModel>();

  for (const connectionId of connectionIds) {
    for (const model of modelsByConnection[connectionId] || []) {
      if (!model?.id || models.has(model.id)) continue;
      models.set(model.id, model);
    }
  }

  return Array.from(models.values());
}

async function unionCustomModels(
  providerId: string,
  models: SyncedAvailableModel[]
): Promise<SyncedAvailableModel[]> {
  let customModels: SyncedAvailableModel[];
  try {
    customModels = normalizeSyncedAvailableModels(await getCustomModels(providerId), providerId);
  } catch {
    return models;
  }
  const merged = new Map(models.filter((model) => model?.id).map((model) => [model.id, model]));
  for (const model of customModels) {
    if (!model.id) continue;
    const existing = merged.get(model.id);
    const overlay = Object.fromEntries(
      Object.entries(model).filter(([, value]) => value !== undefined)
    ) as Partial<SyncedAvailableModel>;
    merged.set(model.id, { ...existing, ...overlay, id: model.id } as SyncedAvailableModel);
  }
  return Array.from(merged.values());
}

async function loadConnectionCatalog(providerId: string): Promise<SyncedAvailableModel[]> {
  const [connections, modelsByConnection] = await Promise.all([
    getRawProviderConnections({ provider: providerId, isActive: true }, undefined, undefined, [
      "id",
      "provider",
    ]),
    getSyncedAvailableModelsByConnection(providerId),
  ]);
  const ids = connections
    .map(readConnectionRef)
    .filter((connection): connection is ProviderConnectionRef => connection !== null)
    .map((connection) => connection.id);
  return collectModelsForConnections(modelsByConnection, ids);
}

/**
 * Return the unioned synced catalog belonging only to active connections.
 *
 * A provider is authoritative only when at least one active connection has a
 * non-empty usable catalog. Missing, empty, malformed, or unavailable state
 * fails open to the static registry.
 */
export async function getActiveSyncedCatalog(providerId: string): Promise<ActiveSyncedCatalog> {
  const storedProviderId = resolveStoredProviderId(providerId);
  if (!storedProviderId) {
    return { authoritative: false, models: [] };
  }

  try {
    const catalogs = await Promise.all(catalogLookupIds(storedProviderId).map(loadConnectionCatalog));
    const models = await unionCustomModels(storedProviderId, unionModels(catalogs));
    if (models.length > 0) {
      return {
        authoritative: providerUsesAuthoritativeLiveCatalog(providerId),
        models,
      };
    }

    // No ACTIVE CONNECTION carries a catalog for this provider — but a provider
    // NODE can: nodes live in `provider_nodes`, never in `provider_connections`,
    // so filtering by active connection ids drops their synced catalog entirely.
    // Before #9294 this path read the provider-wide key_value set, and losing it
    // took every node's runtime metadata with it (supportedThinkingEfforts, so
    // `-high`/`-low` effort suffixes stopped resolving, plus contextWindow /
    // maxInputTokens used by the combo context-window filter).
    //
    // Fall back to that provider-wide set, and deliberately keep it
    // NON-authoritative: #9294's live-catalog gating is about what an active
    // connection actually serves, so a node-backed catalog must inform metadata
    // without ever being used to reject a model as unavailable.
    return {
      authoritative: false,
      models: await unionCustomModels(
        storedProviderId,
        await getSyncedAvailableModels(storedProviderId)
      ),
    };
  } catch {
    return { authoritative: false, models: [] };
  }
}

/**
 * Return non-empty synced catalogs grouped by provider, restricted to active
 * connections. This is the authoritative live source for /v1/models.
 */
export async function getAllActiveSyncedModels(): Promise<Record<string, SyncedAvailableModel[]>> {
  try {
    const connections = await getRawProviderConnections({ isActive: true }, undefined, undefined, [
      "id",
      "provider",
    ]);

    const connectionIdsByProvider = new Map<string, Set<string>>();

    for (const rawConnection of connections) {
      const connection = readConnectionRef(rawConnection);
      if (!connection) continue;

      if (!connectionIdsByProvider.has(connection.provider)) {
        connectionIdsByProvider.set(connection.provider, new Set());
      }

      connectionIdsByProvider.get(connection.provider)!.add(connection.id);
    }

    const result: Record<string, SyncedAvailableModel[]> = {};

    await Promise.all(
      Array.from(connectionIdsByProvider.entries()).map(async ([providerId, connectionIds]) => {
        const modelsByConnection = await getSyncedAvailableModelsByConnection(providerId);

        const models = await unionCustomModels(
          providerId,
          collectModelsForConnections(modelsByConnection, connectionIds)
        );

        if (models.length > 0) {
          result[providerId] = models;
        }
      })
    );

    return result;
  } catch {
    return {};
  }
}

/**
 * Remove static provider candidates whose active live catalog exists but does
 * not contain the requested model. Providers without a usable live catalog
 * retain their static fallback behavior.
 */
export async function reconcileProvidersWithActiveSyncedCatalog(
  providerIds: string[],
  modelId: string
): Promise<ProviderCatalogReconciliation> {
  const uniqueProviders = Array.from(
    new Set(
      providerIds.filter(
        (provider): provider is string => typeof provider === "string" && provider.length > 0
      )
    )
  );

  const states = await Promise.all(
    uniqueProviders.map(async (provider) => ({
      provider,
      catalog: await getActiveSyncedCatalog(provider),
    }))
  );

  const providers: string[] = [];
  const excludedProviders: string[] = [];

  for (const { provider, catalog } of states) {
    const modelIsLive = catalog.models.some((model) => model.id === modelId);
    // Cursor auto-router: always allow `auto` / router variants even if a stale live
    // catalog omitted them (AvailableModels / agent list often returns wire id
    // `default` only; listing injects `auto` + cost/balance/intelligence).
    const cursorAutoAllow =
      provider === "cursor" &&
      (modelId === "auto" ||
        modelId === "default" ||
        modelId === "auto-cost" ||
        modelId === "auto-balance" ||
        modelId === "auto-intelligence");

    if (!catalog.authoritative || modelIsLive || cursorAutoAllow) {
      providers.push(provider);
    } else {
      excludedProviders.push(provider);
    }
  }

  return { providers, excludedProviders };
}
