type IntelSyncStatus =
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

interface RadarIntelCacheEntry {
  version: string;
  tier: "live";
  payload: string;
  signature: string;
  supporterIdentity: string;
  fetchedAt?: string;
}

interface IntelSyncDeps {
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  getFlag?: (key: string) => boolean;
  getSettings?: () => { optIn: boolean; supporterKey: string | null };
  getCache?: () => RadarIntelCacheEntry | null;
  setCache?: (entry: RadarIntelCacheEntry) => void;
  recognizeSupporter?: (identity: string) => Promise<void>;
}

export function syncRadarIntel(deps?: IntelSyncDeps): Promise<IntelSyncStatus>;
