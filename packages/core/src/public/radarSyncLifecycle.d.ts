type CatalogSyncStatus =
  | { status: "disabled" | "opt_out" | "invalid_signature" | "invalid_schema" | "stale" | "too_large" }
  | { status: "updated"; version: string; tier: string }
  | { status: "error"; reason: string };

type ReferralsSyncStatus =
  | { status: "disabled" | "opt_out" | "invalid_signature" | "invalid_schema" | "stale" | "too_large" }
  | { status: "updated"; generatedAt: string; tier: string }
  | { status: "error"; reason: string };

type SupporterSyncStatus =
  | { status: "disabled" | "opt_out" | "no_key" | "invalid_signature" | "invalid_schema" | "wrong_tier" | "stale" | "too_large" }
  | { status: "updated"; version: string }
  | { status: "error"; reason: string };

interface RadarSchedulerDeps {
  getFlag?: (key: string) => boolean;
  getSettings?: () => { optIn: boolean };
  getCache?: () => { fetchedAt: string } | null;
  sync?: () => Promise<CatalogSyncStatus>;
  getReferralsCache?: () => { fetchedAt: string } | null;
  syncReferrals?: () => Promise<ReferralsSyncStatus>;
  getOffersCache?: () => { fetchedAt: string } | null;
  syncOffers?: () => Promise<SupporterSyncStatus>;
  getIntelCache?: () => { fetchedAt: string } | null;
  syncIntel?: () => Promise<SupporterSyncStatus>;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}

export function initRadarSyncScheduler(deps?: RadarSchedulerDeps): boolean;
export function stopRadarSyncScheduler(deps?: RadarSchedulerDeps): void;
