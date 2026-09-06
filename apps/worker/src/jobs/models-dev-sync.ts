import { getSettings } from "@shiguang-gateway/core-domain/db/settings";
import {
  isModelsDevSyncEnvDisabled,
  isModelsDevSyncEnvForcedOn,
  resolveModelsDevSyncIntervalMs,
  syncModelsDev,
} from "@shiguang-gateway/core-domain/sync/models-dev";

const SETTINGS_POLL_INTERVAL_MS = 1_000;
type Timer = ReturnType<typeof setInterval>;

export interface ModelsDevSchedulerDependencies {
  getSettings: typeof getSettings;
  sync: typeof syncModelsDev;
  envDisabled: typeof isModelsDevSyncEnvDisabled;
  envForcedOn: typeof isModelsDevSyncEnvForcedOn;
  resolveIntervalMs: typeof resolveModelsDevSyncIntervalMs;
  setInterval: (callback: () => void, intervalMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  createAbortController: () => AbortController;
  log: Pick<Console, "log" | "warn">;
}

export function createModelsDevScheduler(dependencies: ModelsDevSchedulerDependencies) {
  let settingsTimer: Timer | null = null;
  let syncTimer: Timer | null = null;
  let activeController: AbortController | null = null;
  let activePromise: Promise<unknown> | null = null;
  let activeIntervalMs: number | null = null;

  function launch(label: "Initial" | "Periodic"): void {
    if (activePromise) return;
    const controller = dependencies.createAbortController();
    activeController = controller;
    const promise = dependencies.sync({ signal: controller.signal });
    activePromise = promise;
    void promise.then(
      (result) => {
        if (result.success) dependencies.log.log(`[MODELS_DEV] ${label} sync complete: ${result.modelCount} pricing entries`);
      },
      (error) => dependencies.log.warn(`[MODELS_DEV] ${label} sync error:`, error instanceof Error ? error.message : error),
    ).finally(() => {
      if (activeController === controller) activeController = null;
      if (activePromise === promise) activePromise = null;
    });
  }

  function stopSyncLoop(): void {
    if (syncTimer) dependencies.clearInterval(syncTimer);
    syncTimer = null;
    activeIntervalMs = null;
    activeController?.abort();
    activeController = null;
  }

  async function refresh(): Promise<void> {
    const settings = await dependencies.getSettings();
    const enabled = !dependencies.envDisabled() &&
      (dependencies.envForcedOn() || settings.modelsDevSyncEnabled === true);
    if (!enabled) {
      stopSyncLoop();
      return;
    }
    const intervalMs = dependencies.resolveIntervalMs(settings.modelsDevSyncInterval);
    if (syncTimer && activeIntervalMs === intervalMs) return;
    stopSyncLoop();
    activeIntervalMs = intervalMs;
    dependencies.log.log(`[MODELS_DEV] Starting periodic sync every ${intervalMs / 1000}s`);
    launch("Initial");
    syncTimer = dependencies.setInterval(() => launch("Periodic"), intervalMs);
    syncTimer.unref?.();
  }

  return {
    async start(): Promise<void> {
      if (settingsTimer) return;
      await refresh();
      settingsTimer = dependencies.setInterval(() => {
        void refresh().catch((error) => {
          dependencies.log.warn("[MODELS_DEV] Failed to refresh scheduler settings:", error);
        });
      }, SETTINGS_POLL_INTERVAL_MS);
      settingsTimer.unref?.();
    },
    stop(): void {
      if (settingsTimer) dependencies.clearInterval(settingsTimer);
      settingsTimer = null;
      stopSyncLoop();
    },
  };
}

const scheduler = createModelsDevScheduler({
  getSettings,
  sync: syncModelsDev,
  envDisabled: isModelsDevSyncEnvDisabled,
  envForcedOn: isModelsDevSyncEnvForcedOn,
  resolveIntervalMs: resolveModelsDevSyncIntervalMs,
  setInterval,
  clearInterval,
  createAbortController: () => new AbortController(),
  log: console,
});

export function startModelsDevSyncScheduler(): Promise<void> { return scheduler.start(); }
export function stopModelsDevSyncScheduler(): void { scheduler.stop(); }
