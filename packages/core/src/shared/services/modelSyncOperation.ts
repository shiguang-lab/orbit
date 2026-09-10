import { getSettings, updateSettings } from "../../lib/db/settings.js";
import { getProviderConnections } from "../../lib/db/providers.js";
import { isConnectionUnavailableToAuxiliaryActivity } from "../../lib/exclusiveLeaseIsolation.js";
import {
  buildModelSyncInternalHeaders,
  fetchModelSyncInternal,
  getModelSyncInternalBaseUrl,
} from "./modelSyncClient.js";

export { revalidateCodexCatalogsOnStartup } from "./codexCatalogRevalidation.js";

const MODEL_SYNC_SETTING_KEY = "model_sync_last_run";

export type AutoSyncConnection = {
  id: string;
  provider: string;
  name?: string;
};

let isRunning = false;

async function getAutoSyncConnections(): Promise<AutoSyncConnection[]> {
  try {
    const connections = await getProviderConnections();
    const autoSyncConnections: AutoSyncConnection[] = [];
    for (const conn of connections) {
      if (!conn.isActive && conn.isActive !== undefined) continue;
      if (
        typeof conn.id === "string" &&
        (await isConnectionUnavailableToAuxiliaryActivity(conn.id))
      ) {
        continue;
      }
      const psd =
        conn.providerSpecificData && typeof conn.providerSpecificData === "object"
          ? (conn.providerSpecificData as Record<string, unknown>)
          : {};
      if (psd.autoSync !== true) continue;
      if (typeof conn.id !== "string" || typeof conn.provider !== "string") continue;
      autoSyncConnections.push({
        id: conn.id,
        provider: conn.provider,
        ...(typeof conn.name === "string" ? { name: conn.name } : {}),
      });
    }
    return autoSyncConnections;
  } catch (error) {
    console.warn("[ModelSync] Failed to load connections:", (error as Error).message);
    return [];
  }
}

/** Run model discovery for one provider connection through the internal API. */
export async function syncConnectionModels(
  connectionId: string,
  provider: string,
  baseUrl = getModelSyncInternalBaseUrl()
): Promise<boolean> {
  try {
    const res = await fetchModelSyncInternal(
      `${baseUrl}/api/providers/${connectionId}/sync-models`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...buildModelSyncInternalHeaders(),
        },
        body: JSON.stringify({}),
      }
    );
    if (!res.ok) {
      console.warn(
        `[ModelSync] ${provider} (${connectionId.slice(0, 8)}): sync returned ${res.status}`
      );
      return false;
    }
    const data = (await res.json()) as { syncedModels?: number };
    console.log(
      `[ModelSync] ${provider} (${connectionId.slice(0, 8)}): ✓ ${data.syncedModels || 0} models`
    );
    return true;
  } catch (error) {
    console.warn(
      `[ModelSync] ${provider} (${connectionId.slice(0, 8)}): fetch failed —`,
      (error as Error).message
    );
    return false;
  }
}

/** Execute one model-sync cycle without creating timers or background jobs. */
export async function runModelSyncCycle(apiBaseUrl = getModelSyncInternalBaseUrl()): Promise<void> {
  if (isRunning) {
    console.log("[ModelSync] Skipping cycle — previous run still in progress");
    return;
  }
  isRunning = true;
  const start = Date.now();

  try {
    const connections = await getAutoSyncConnections();
    if (connections.length === 0) {
      console.log("[ModelSync] No connections with autoSync enabled — skipping cycle");
      return;
    }

    console.log(`[ModelSync] Starting model sync cycle — ${connections.length} connection(s)`);
    const results = await Promise.allSettled(
      connections.map((connection) =>
        syncConnectionModels(
          connection.id,
          connection.name || connection.provider,
          apiBaseUrl
        )
      )
    );
    const succeeded = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;
    console.log(
      `[ModelSync] Cycle complete: ${succeeded}/${connections.length} synced in ${Date.now() - start}ms`
    );

    try {
      await updateSettings({ [MODEL_SYNC_SETTING_KEY]: new Date().toISOString() });
    } catch {
      // Last-run telemetry is non-critical.
    }
  } finally {
    isRunning = false;
  }
}

export async function getLastModelSyncTime(): Promise<string | null> {
  try {
    const settings = await getSettings();
    return (settings as Record<string, string>)[MODEL_SYNC_SETTING_KEY] ?? null;
  } catch {
    return null;
  }
}
