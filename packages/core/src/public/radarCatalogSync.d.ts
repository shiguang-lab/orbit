type SyncStatus =
  | { status: "disabled" }
  | { status: "opt_out" }
  | { status: "invalid_signature" }
  | { status: "invalid_schema" }
  | { status: "stale" }
  | { status: "too_large" }
  | { status: "updated"; version: string; tier: string }
  | { status: "error"; reason: string };

interface RadarCacheEntry {
  version: string;
  generatedAt?: string | null;
  tier: string;
  payload: string;
  signature: string;
  fetchedAt?: string;
}

interface SyncDeps {
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  getFlag?: (key: string) => boolean;
  getSettings?: () => { optIn: boolean; supporterKey: string | null };
  getCache?: () => RadarCacheEntry | null;
  setCache?: (entry: RadarCacheEntry) => void;
}

export function syncRadar(deps?: SyncDeps): Promise<SyncStatus>;
