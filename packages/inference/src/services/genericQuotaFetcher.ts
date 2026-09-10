/**
 * genericQuotaFetcher.ts — Generic preflight quota fetcher
 *
 * Wraps the existing per-provider usage fetchers in `usage.ts` so that any
 * provider with a `getUsageForProvider` implementation gets per-window
 * preflight enforcement automatically. This is the bridge between the
 * dashboard's "Provider Limits" data (which already supports ~16 providers)
 * and the quotaPreflight system (which previously only had Codex).
 *
 * For providers that ship their own custom QuotaFetcher (Codex, CROF,
 * DeepSeek, Bailian Coding Plan, etc.) the registrar skips them — their
 * bespoke fetchers stay in charge.
 *
 * Each provider's first successful response also populates the static
 * `registerQuotaWindows` registry so other callers (UI window catalog,
 * tests) can discover which windows that provider exposes.
 */

import { getUsageForProvider, USAGE_FETCHER_PROVIDERS } from "./usage.ts";
import {
  getQuotaFetcher,
  registerQuotaFetcher,
  registerQuotaWindows,
  type QuotaFetcher,
  type QuotaInfo,
} from "./quotaPreflight.ts";
import {
  getAntigravityQuotaFamily,
  getQuotaFetchScope,
} from "./antigravityQuotaFamily.ts";

type UsageFetcher = (
  connection: Parameters<typeof getUsageForProvider>[0],
  options?: { forceRefresh?: boolean }
) => Promise<unknown>;

let usageFetcherOverride: UsageFetcher | null = null;

// 60s — matches Codex's TTL. Long enough to avoid hammering upstream usage
// endpoints on every routing decision, short enough that a near-exhausted
// account is skipped within one minute of crossing its threshold.
const CACHE_TTL_MS = 60_000;
const PENDING_FORCE_REFRESH_TTL_MS = CACHE_TTL_MS * 5;
const pendingForceRefresh = new Map<string, number>();
const pendingForceRefreshMiss = new Map<string, number>();

export function __setGenericUsageFetcherForTests(fetcher: UsageFetcher | null): void {
  usageFetcherOverride = fetcher;
}

export function __resetGenericQuotaFetcherForTests(): void {
  cache.clear();
  pendingForceRefresh.clear();
  pendingForceRefreshMiss.clear();
}

interface CacheEntry {
  quota: QuotaInfo;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

function connectionKey(provider: string, connectionId: string): string {
  return `${provider.trim()}::${connectionId.trim()}`;
}

function cacheKey(provider: string, connectionId: string, requestedModel?: string | null): string {
  return `${connectionKey(provider, connectionId)}::${getQuotaFetchScope(provider, requestedModel)}`;
}

function pruneStaleQuotaCache(now = Date.now()): void {
  for (const [key, entry] of cache) {
    if (now - entry.fetchedAt > CACHE_TTL_MS * 5) cache.delete(key);
  }
  for (const [key, stampedAt] of pendingForceRefresh) {
    if (now - stampedAt > PENDING_FORCE_REFRESH_TTL_MS) {
      pendingForceRefresh.delete(key);
      pendingForceRefreshMiss.delete(key);
    }
  }
}

function isPendingForceRefresh(key: string, now = Date.now()): boolean {
  const stampedAt = pendingForceRefresh.get(key);
  if (stampedAt === undefined) return false;
  if (now - stampedAt > PENDING_FORCE_REFRESH_TTL_MS) {
    pendingForceRefresh.delete(key);
    pendingForceRefreshMiss.delete(key);
    return false;
  }
  return true;
}

function markPendingForceRefreshMiss(key: string): void {
  if (isPendingForceRefresh(key)) pendingForceRefreshMiss.set(key, Date.now());
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Compute percentUsed (0-1) for a single quota entry. Prefers the explicit
 * remainingPercentage / used / total fields surfaced by per-provider
 * fetchers (see `usage.ts`). Returns null when the entry is unlimited or
 * doesn't expose enough data to compute a percent — preflight ignores
 * those windows.
 */
function percentUsedForQuota(entry: unknown): number | null {
  if (!entry || typeof entry !== "object") return null;
  const q = entry as Record<string, unknown>;
  if (q.unlimited === true) return null;
  // Upstream explicitly told us it did not report this window's fraction
  // (e.g. Antigravity per-model quota with no usage data yet). Treat as
  // unknown rather than defaulting remainingPercentage:0 into "100% used" —
  // otherwise one unreported model falsely exhausts the whole connection.
  if (q.fractionReported === false) return null;

  const remainingPercentage = toNumber(q.remainingPercentage);
  if (remainingPercentage !== null) {
    // remainingPercentage is 0-100 in the usage.ts contract.
    const used = (100 - Math.max(0, Math.min(100, remainingPercentage))) / 100;
    return used;
  }

  const used = toNumber(q.used);
  const total = toNumber(q.total);
  if (used !== null && total !== null && total > 0) {
    return Math.max(0, Math.min(1, used / total));
  }

  return null;
}

function resetAtForQuota(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const q = entry as Record<string, unknown>;
  return typeof q.resetAt === "string" ? q.resetAt : null;
}

interface ConnectionInputs {
  id?: string;
  provider?: string;
  accessToken?: string;
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
  projectId?: string;
  email?: string;
  requestedModel?: string;
}

type UsageToQuotaContext = {
  provider?: string | null;
  requestedModel?: string | null;
};

/**
 * Reshape a raw `getUsageForProvider` response into the preflight `QuotaInfo`
 * contract. Returns `null` if there are no measurable windows (all unlimited
 * / shape-unknown / missing). Exported for unit testing — the production path
 * is `fetchGenericQuota`, which adds caching + the upstream call.
 */
export function convertUsageToQuotaInfo(
  usage: unknown,
  context: UsageToQuotaContext = {}
): QuotaInfo | null {
  if (!usage || typeof usage !== "object") return null;
  const usageRecord = usage as Record<string, unknown>;
  if (
    typeof usageRecord.message === "string" &&
    (!usageRecord.quotas || typeof usageRecord.quotas !== "object")
  ) {
    // Provider explicitly told us it couldn't fetch (auth expired, etc.).
    // Fail open — let the request proceed and surface the failure through
    // its normal error path.
    return null;
  }

  const quotasObj = usageRecord.quotas;
  if (!quotasObj || typeof quotasObj !== "object" || Array.isArray(quotasObj)) {
    return null;
  }

  const windows: Record<string, { percentUsed: number; resetAt: string | null }> = {};
  for (const [name, entry] of Object.entries(quotasObj as Record<string, unknown>)) {
    const percentUsed = percentUsedForQuota(entry);
    if (percentUsed === null) continue;
    const resetAt = resetAtForQuota(entry);
    windows[name] = { percentUsed, resetAt };
  }

  if (Object.keys(windows).length === 0) return null;

  const requestedFamily =
    isAntigravityProvider(context.provider) && context.requestedModel
      ? getAntigravityQuotaFamily(context.requestedModel)
      : null;
  const scopedWindows =
    requestedFamily === "gemini" || requestedFamily === "claude"
      ? Object.fromEntries(
          Object.entries(windows).filter(([key]) =>
            key.endsWith("_weekly")
              ? antigravityWeeklyWindowMatchesFamily(key, requestedFamily)
              : getAntigravityQuotaFamily(key) === requestedFamily
          )
        )
      : windows;
  if (Object.keys(scopedWindows).length === 0) return null;

  const normalized = normalizeQuotaWindows(scopedWindows, context);
  const worst = Object.values(scopedWindows).reduce<
    { percentUsed: number; resetAt: string | null } | null
  >((current, entry) => (!current || entry.percentUsed > current.percentUsed ? entry : current), null);
  const worstPercent = worst?.percentUsed ?? 0;
  const worstResetAt = worst?.resetAt ?? null;

  return {
    used: 0,
    total: 0,
    percentUsed: worstPercent,
    resetAt: worstResetAt,
    windows: scopedWindows,
    ...normalized,
    limitReached: worstPercent >= 1 - 1e-9,
  };
}

/**
 * Map provider-native window keys to canonical structural windows so that
 * reset-aware / reset-window scoring works without knowing every provider's
 * naming convention.
 *
 *   - Claude: "session (5h)" → window5h, "weekly (7d)" → window7d
 *   - Antigravity: worst per-model quota → window5h; worst *_weekly quota → window7d
 */
const TIME_WINDOW_KEYS = new Set([
  "session",
  "weekly",
  "daily",
  "monthly",
  "session (5h)",
  "weekly (7d)",
  "AFPFiveHour",
  "AFPWeekly",
  "AFPDaily",
  "AFPMonthly",
]);

function isAntigravityProvider(provider: string | null | undefined): boolean {
  return provider === "antigravity" || provider === "agy";
}

function antigravityWeeklyWindowMatchesFamily(
  key: string,
  family: "gemini" | "claude"
): boolean {
  return family === "gemini" ? key === "gemini_weekly" : key === "claude_gpt_weekly";
}

function normalizeQuotaWindows(
  windows: Record<string, { percentUsed: number; resetAt: string | null }>,
  context: UsageToQuotaContext
): Record<string, { percentUsed: number; resetAt: string | null }> {
  const normalized: Record<string, { percentUsed: number; resetAt: string | null }> = {};
  const requestedFamily =
    isAntigravityProvider(context.provider) && context.requestedModel
      ? getAntigravityQuotaFamily(context.requestedModel)
      : null;

  // Claude-style explicit time windows.
  const fiveHourWindow = windows["session (5h)"] || windows.session;
  if (fiveHourWindow && !normalized.window5h) {
    normalized.window5h = fiveHourWindow;
  }
  const sevenDayWindow = windows["weekly (7d)"] || windows.weekly;
  if (sevenDayWindow && !normalized.window7d) {
    normalized.window7d = sevenDayWindow;
  }

  // Antigravity-style per-model 5h windows: pick the worst (most used) model quota.
  const modelWindows = Object.entries(windows).filter(
    ([key]) =>
      key !== "credits" &&
      !key.endsWith("_weekly") &&
      !key.startsWith("window") &&
      !key.includes("(5h)") &&
      !key.includes("(7d)") &&
      !TIME_WINDOW_KEYS.has(key) &&
      (requestedFamily === null ||
        requestedFamily === "other" ||
        getAntigravityQuotaFamily(key) === requestedFamily)
  );
  if (modelWindows.length > 0 && !normalized.window5h) {
    const worst = modelWindows.reduce((a, b) => (a[1].percentUsed > b[1].percentUsed ? a : b));
    normalized.window5h = worst[1];
  }

  // Antigravity-style weekly family buckets: pick the worst *_weekly quota.
  const weeklyWindows = Object.entries(windows).filter(([key]) => {
    const scoped = requestedFamily === "gemini" || requestedFamily === "claude";
    return key.endsWith("_weekly") &&
      (!scoped || antigravityWeeklyWindowMatchesFamily(key, requestedFamily));
  });
  if (weeklyWindows.length > 0 && !normalized.window7d) {
    const worst = weeklyWindows.reduce((a, b) => (a[1].percentUsed > b[1].percentUsed ? a : b));
    normalized.window7d = worst[1];
  }

  return normalized;
}

/**
 * Fetch quota for a connection by delegating to the appropriate
 * provider-specific usage fetcher and reshaping its output into the
 * preflight `QuotaInfo` contract (with a `windows` map for per-window
 * threshold evaluation).
 */
export const fetchGenericQuota: QuotaFetcher = async (connectionId, connection) => {
  pruneStaleQuotaCache();
  if (!connection) return null;
  const conn = connection as ConnectionInputs;
  const provider = typeof conn.provider === "string" ? conn.provider.trim() : "";
  if (!provider) return null;

  const requestedModel = typeof conn.requestedModel === "string" ? conn.requestedModel : undefined;
  const key = cacheKey(provider, connectionId, requestedModel);
  const forceKey = connectionKey(provider, connectionId);
  const now = Date.now();
  const forceRefresh = isPendingForceRefresh(forceKey, now);
  const cached = cache.get(key);
  if (!forceRefresh && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.quota;
  }
  const missedAt = pendingForceRefreshMiss.get(forceKey);
  if (forceRefresh && missedAt !== undefined && now - missedAt < CACHE_TTL_MS) return null;
  const refreshStamp = pendingForceRefresh.get(forceKey);

  let usage: unknown;
  try {
    const fetchUsage = usageFetcherOverride ?? getUsageForProvider;
    usage = await fetchUsage(conn as Parameters<typeof getUsageForProvider>[0], {
      ...(forceRefresh ? { forceRefresh: true } : {}),
    });
  } catch {
    markPendingForceRefreshMiss(forceKey);
    return null;
  }

  const quota = convertUsageToQuotaInfo(usage, { provider, requestedModel });
  if (!quota) {
    markPendingForceRefreshMiss(forceKey);
    return null;
  }

  const currentRefreshStamp = pendingForceRefresh.get(forceKey);
  if (
    currentRefreshStamp !== refreshStamp &&
    currentRefreshStamp !== undefined &&
    Date.now() - currentRefreshStamp <= PENDING_FORCE_REFRESH_TTL_MS
  ) {
    return quota;
  }

  pendingForceRefresh.delete(forceKey);
  pendingForceRefreshMiss.delete(forceKey);

  // Refresh the static window catalog so the dashboard can render the right
  // modal inputs without waiting for the user to open the page.
  const unscopedQuota = convertUsageToQuotaInfo(usage, { provider });
  registerQuotaWindows(provider, Object.keys(unscopedQuota?.windows || quota.windows || {}));

  cache.set(key, { quota, fetchedAt: Date.now() });
  return quota;
};

/**
 * Force-invalidate the cache for a connection — call after the connection
 * receives an upstream 429 / quota-reset event so the next preflight gets
 * fresh data instead of a 60s stale window.
 */
export function invalidateGenericQuotaCache(provider: string, connectionId: string): void {
  const forceKey = connectionKey(provider, connectionId);
  const prefix = `${forceKey}::`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  pendingForceRefresh.set(forceKey, Date.now());
  pendingForceRefreshMiss.delete(forceKey);
}

export function invalidateGenericQuotaCacheOnStatus(args: {
  provider: string | null | undefined;
  connectionId: string | null | undefined;
  status: number;
  isolateProbe?: boolean;
}): boolean {
  if (args.isolateProbe === true || args.status !== 429) return false;
  const provider = typeof args.provider === "string" ? args.provider.trim() : "";
  const connectionId = typeof args.connectionId === "string" ? args.connectionId.trim() : "";
  if (!provider || !connectionId) return false;
  invalidateGenericQuotaCache(provider, connectionId);
  return true;
}

/**
 * Register the generic fetcher for every provider that has a usage
 * implementation. Providers with bespoke fetchers (Codex, CROF, DeepSeek,
 * Bailian Coding Plan) MUST be registered before this runs so the defensive
 * `getQuotaFetcher` check below preserves them — see `src/sse/handlers/chat.ts`
 * for the registration order. Idempotent: re-running this is a no-op.
 */
export function registerGenericQuotaFetchers(): void {
  for (const provider of USAGE_FETCHER_PROVIDERS) {
    if (getQuotaFetcher(provider)) continue; // bespoke fetcher already registered — leave it alone
    registerQuotaFetcher(provider, fetchGenericQuota);
  }
}
