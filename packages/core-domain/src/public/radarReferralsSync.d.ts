type ReferralsSyncStatus =
  | { status: "disabled" }
  | { status: "opt_out" }
  | { status: "invalid_signature" }
  | { status: "invalid_schema" }
  | { status: "stale" }
  | { status: "too_large" }
  | { status: "updated"; generatedAt: string; tier: string }
  | { status: "error"; reason: string };

interface RadarReferralsCacheEntry {
  generatedAt: string;
  tier: string;
  payload: string;
  signature: string;
  fetchedAt?: string;
}

interface ReferralsSyncDeps {
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  getFlag?: (key: string) => boolean;
  getSettings?: () => { optIn: boolean; supporterKey: string | null };
  getCache?: () => RadarReferralsCacheEntry | null;
  setCache?: (entry: RadarReferralsCacheEntry) => void;
}

export function shouldSyncReferralsOnRead(
  fetchedAt: string | null | undefined,
  nowMs: number,
  staleMs?: number,
): boolean;
export function syncRadarReferrals(deps?: ReferralsSyncDeps): Promise<ReferralsSyncStatus>;
