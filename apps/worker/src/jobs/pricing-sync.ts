import { syncPricingFromSources } from "@shiguang-gateway/core-domain/pricing/sync";

type Timer = ReturnType<typeof setInterval>;
export interface PricingSyncSchedulerDependencies {
  sync: typeof syncPricingFromSources;
  enabled: () => boolean;
  intervalMs: () => number;
  setInterval: (callback: () => void, intervalMs: number) => Timer;
  clearInterval: (timer: Timer) => void;
  log: Pick<Console, "log" | "warn">;
}

export function createPricingSyncScheduler(dependencies: PricingSyncSchedulerDependencies) {
  let timer: Timer | null = null;
  let active: Promise<unknown> | null = null;
  function launch(label: "Initial" | "Periodic"): void {
    if (active) return;
    const promise = dependencies.sync();
    active = promise;
    void promise.then(
      (result) => {
        if (result.success) dependencies.log.log(`[PRICING_SYNC] ${label} sync complete: ${result.modelCount} models`);
      },
      (error) => dependencies.log.warn(`[PRICING_SYNC] ${label} sync error:`, error instanceof Error ? error.message : error),
    ).finally(() => { if (active === promise) active = null; });
  }
  return {
    start(): void {
      if (timer || !dependencies.enabled()) return;
      const intervalMs = dependencies.intervalMs();
      dependencies.log.log(`[PRICING_SYNC] Starting periodic sync every ${intervalMs / 1000}s`);
      launch("Initial");
      timer = dependencies.setInterval(() => launch("Periodic"), intervalMs);
      timer.unref?.();
    },
    stop(): void {
      if (timer) dependencies.clearInterval(timer);
      timer = null;
    },
  };
}

function pricingIntervalMs(): number {
  const seconds = Number.parseInt(process.env.PRICING_SYNC_INTERVAL ?? "", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 86_400_000;
}
const scheduler = createPricingSyncScheduler({
  sync: syncPricingFromSources,
  enabled: () => process.env.PRICING_SYNC_ENABLED === "true",
  intervalMs: pricingIntervalMs,
  setInterval,
  clearInterval,
  log: console,
});
export function startPricingSyncScheduler(): void { scheduler.start(); }
export function stopPricingSyncScheduler(): void { scheduler.stop(); }
