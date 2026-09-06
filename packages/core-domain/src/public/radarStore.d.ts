interface RadarCache {
  version: string;
  generatedAt: string | null;
  tier: string;
  payload: string;
  signature: string;
  fetchedAt: string;
}

interface RadarSettings {
  optIn: boolean;
  supporterKey: string | null;
  updatedAt: string;
}

interface RadarReferralsCache {
  generatedAt: string;
  tier: string;
  payload: string;
  signature: string;
  fetchedAt: string;
}

interface RadarOffersCache {
  version: string;
  tier: "live";
  payload: string;
  signature: string;
  fetchedAt: string;
}

interface RadarIntelCache extends RadarOffersCache {
  supporterIdentity: string;
}

interface RadarLocalModelState {
  provider: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean | null;
  tombstoned: boolean;
  updatedAt: string;
}

interface RadarLocalModelOverridePatch {
  displayName?: string | null;
  enabled?: boolean | null;
}

export function clearRadarLocalModelOverride(provider: unknown, modelId: unknown): boolean;
export function getRadarCache(): RadarCache | null;
export function getRadarIntelCache(): RadarIntelCache | null;
export function getRadarOffersCache(): RadarOffersCache | null;
export function getRadarReferralsCache(): RadarReferralsCache | null;
export function getRadarSettings(): RadarSettings;
export function listRadarLocalModelState(): RadarLocalModelState[];
export function setRadarKey(key: string | null): void;
export function setRadarLocalModelOverride(
  provider: unknown,
  modelId: unknown,
  patch: RadarLocalModelOverridePatch,
): boolean;
export function setRadarModelTombstone(
  provider: unknown,
  modelId: unknown,
  tombstoned: boolean,
): boolean;
export function setRadarOptIn(optIn: boolean): void;
