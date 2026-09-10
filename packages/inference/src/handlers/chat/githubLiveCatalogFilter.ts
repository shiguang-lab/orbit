import {
  catalogContainsModel,
  getActiveSyncedCatalog,
  type ActiveSyncedCatalog,
} from "@orbit/core/db/active-synced-catalog";

const catalogsByRequest = new WeakMap<object, Map<string, Promise<ActiveSyncedCatalog>>>();

export function resolveComboCheckProvider(
  modelString: string,
  modelInfo: { provider?: string },
  providerId?: string | null
): string | undefined {
  if (!providerId) return modelInfo.provider;
  if (providerId === modelInfo.provider) return modelInfo.provider;
  if (modelString.startsWith(`${providerId}/`)) return modelInfo.provider;
  return providerId;
}

function loadCatalog(
  requestScope: object,
  providerId: string,
  loader: (id: string) => Promise<ActiveSyncedCatalog>
): Promise<ActiveSyncedCatalog> {
  let byProvider = catalogsByRequest.get(requestScope);
  if (!byProvider) {
    byProvider = new Map();
    catalogsByRequest.set(requestScope, byProvider);
  }
  let pending = byProvider.get(providerId);
  if (!pending) {
    pending = loader(providerId);
    byProvider.set(providerId, pending);
  }
  return pending;
}

/** False means skip; null means continue normal credential checks. */
export async function githubComboCatalogGate(
  requestScope: object,
  provider: string | null | undefined,
  resolvedModel: string,
  loader: (id: string) => Promise<ActiveSyncedCatalog> = getActiveSyncedCatalog
): Promise<boolean | null> {
  if (!provider) return true;
  if (provider !== "github" && provider !== "gh") return null;
  const membership = catalogContainsModel(
    await loadCatalog(requestScope, provider, loader),
    resolvedModel
  );
  return membership === false ? false : null;
}
