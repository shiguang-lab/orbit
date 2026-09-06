type OffersSyncStatus =
  | { status: "disabled" }
  | { status: "opt_out" }
  | { status: "no_key" }
  | { status: "invalid_signature" }
  | { status: "invalid_schema" }
  | { status: "wrong_tier" }
  | { status: "stale" }
  | { status: "too_large" }
  | { status: "updated"; version: string }
  | { status: "error"; reason: string };

interface RadarOffersCacheEntry {
  version: string;
  tier: "live";
  payload: string;
  signature: string;
  fetchedAt?: string;
}

interface OffersSyncDeps {
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  getFlag?: (key: string) => boolean;
  getSettings?: () => { optIn: boolean; supporterKey: string | null };
  getCache?: () => RadarOffersCacheEntry | null;
  setCache?: (entry: RadarOffersCacheEntry) => void;
}

export function syncRadarOffers(deps?: OffersSyncDeps): Promise<OffersSyncStatus>;
