import { getSettings, getSettingsRevision, updateSettings } from "../lib/db/settings.js";
import { invalidateDbCache } from "../lib/db/readCache.js";
import {
  resolveResilienceSettings,
  type ResilienceSettings,
} from "../lib/resilience/settings.js";

export interface ResilienceRuntimeSnapshot {
  revision: number;
  settings: ResilienceSettings;
}

export interface ResilienceRuntimeSettingsPort {
  applyRequestQueueSettings(settings: ResilienceSettings["requestQueue"]): void | Promise<void>;
  setProviderQuotaOverrides(
    settings: ResilienceSettings["providerQuotaOverrides"],
  ): void | Promise<void>;
  resetAllCircuitBreakers(): void | Promise<void>;
}

export interface ResilienceRuntimeRefreshResult {
  status: "applied" | "unchanged" | "stale";
  revision: number;
}

let runtimePort: ResilienceRuntimeSettingsPort | null = null;
let appliedSnapshot: ResilienceRuntimeSnapshot | null = null;
let refreshTail: Promise<void> = Promise.resolve();

export function registerResilienceRuntimeSettingsPort(
  port: ResilienceRuntimeSettingsPort,
): void {
  runtimePort = port;
}

/** Read settings and their revision without returning a torn cross-write snapshot. */
export async function readResilienceRuntimeSnapshot(): Promise<ResilienceRuntimeSnapshot> {
  for (;;) {
    const revision = await getSettingsRevision();
    const settings = resolveResilienceSettings(await getSettings());
    if ((await getSettingsRevision()) === revision) return { revision, settings };
  }
}

export async function persistResilienceSettings(
  settings: ResilienceSettings,
  options?: { expectedRevision?: number },
): Promise<ResilienceRuntimeSnapshot> {
  await updateSettings(
    {
      resilienceSettings: settings,
      requestRetry: settings.waitForCooldown.maxRetries,
      maxRetryIntervalSec: settings.waitForCooldown.maxRetryWaitSec,
    },
    options,
  );
  return readResilienceRuntimeSnapshot();
}

function breakerHintsChanged(
  previous: ResilienceSettings | null,
  next: ResilienceSettings,
): boolean {
  if (!previous) return false;
  return (
    previous.connectionCooldown.oauth.useUpstream429BreakerHints !==
      next.connectionCooldown.oauth.useUpstream429BreakerHints ||
    previous.connectionCooldown.apikey.useUpstream429BreakerHints !==
      next.connectionCooldown.apikey.useUpstream429BreakerHints
  );
}

async function performRefresh(
  options: { minimumRevision?: number; force?: boolean; source?: string } = {},
): Promise<ResilienceRuntimeRefreshResult> {
  const snapshot = await readResilienceRuntimeSnapshot();
  if (options.minimumRevision !== undefined && snapshot.revision < options.minimumRevision) {
    return { status: "stale", revision: snapshot.revision };
  }
  if (!options.force && appliedSnapshot?.revision === snapshot.revision) {
    return { status: "unchanged", revision: snapshot.revision };
  }
  if (!runtimePort) {
    throw new Error("Resilience runtime settings port is not installed");
  }

  // A command may follow a write performed by another process. Drop this
  // process's TTL copy so request paths observe the same snapshot immediately.
  invalidateDbCache("settings");
  await runtimePort.applyRequestQueueSettings(snapshot.settings.requestQueue);
  await runtimePort.setProviderQuotaOverrides(snapshot.settings.providerQuotaOverrides);
  if (breakerHintsChanged(appliedSnapshot?.settings ?? null, snapshot.settings)) {
    await runtimePort.resetAllCircuitBreakers();
  }
  appliedSnapshot = snapshot;
  return { status: "applied", revision: snapshot.revision };
}

export function refreshResilienceRuntimeSettings(
  options: { minimumRevision?: number; force?: boolean; source?: string } = {},
): Promise<ResilienceRuntimeRefreshResult> {
  const refresh = refreshTail.then(() => performRefresh(options));
  refreshTail = refresh.then(
    () => undefined,
    () => undefined,
  );
  return refresh;
}
