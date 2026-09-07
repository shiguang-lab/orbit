/** Pure configuration helpers for the free-proxy auto-sync scheduler. */

const DEFAULT_INTERVAL_MS = 1_800_000;
const MIN_INTERVAL_MS = 300_000;

export function isFreeProxyAutoSyncEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.FREE_PROXY_AUTO_SYNC_ENABLED === "true";
}

export function getFreeProxyAutoSyncIntervalMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = parseInt(env.FREE_PROXY_AUTO_SYNC_INTERVAL_MS ?? "", 10);
  const candidate = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS;
  return Math.max(candidate, MIN_INTERVAL_MS);
}
