import {
  listSubscriptions,
  syncSubscription,
} from "@shiguang-gateway/core-domain/proxy-subscriptions/management";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

function isSubscriptionDue(
  subscription: { enabled: boolean; lastFetchedAt: string | null; updateIntervalMinutes: number },
  now: number,
): boolean {
  if (!subscription.enabled) return false;
  const lastFetchedAt = subscription.lastFetchedAt ? Date.parse(subscription.lastFetchedAt) : NaN;
  if (!Number.isFinite(lastFetchedAt)) return true;
  return now - lastFetchedAt >= Math.max(0, subscription.updateIntervalMinutes) * 60_000;
}

async function refreshDueSubscriptions(): Promise<void> {
  try {
    const subscriptions = await listSubscriptions();
    const now = Date.now();
    for (const subscription of subscriptions) {
      if (!isSubscriptionDue(subscription, now)) continue;
      try {
        await syncSubscription(subscription.id);
      } catch (error) {
        console.warn(
          `[ProxySubscription] refresh failed for ${subscription.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  } catch (error) {
    console.warn(
      `[ProxySubscription] scheduler tick error: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export function startSubscriptionScheduler(): void {
  if (schedulerTimer || process.env.NODE_ENV === "test") return;
  schedulerTimer = setInterval(() => void refreshDueSubscriptions(), 60_000);
  schedulerTimer.unref?.();
}

export function stopSubscriptionScheduler(): void {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
}
