type RadarLocalizedText = string | { en: string; pt?: string };

interface MergedEntry {
  provider: string;
  modelId: string;
  displayName: string;
  familyId?: string | null;
  monthlyTokens: number;
  creditTokens: number;
  freeType:
    | "recurring-daily"
    | "recurring-monthly"
    | "recurring-uncapped"
    | "recurring-credit"
    | "keyless"
    | "one-time-initial"
    | "discontinued";
  poolKey: string | null;
  tos: "ok" | "caution" | "ambiguous" | "avoid" | "unknown";
  trainsOnPrompts?: boolean;
  enabled?: boolean;
  origin: "baseline" | "radar" | "local";
  disabledBy?: "radar";
  contextWindow?: number | null;
  capabilities?: { tools: boolean | null; vision: boolean | null; thinking: boolean | null };
  metadataEvidenceUrls?: string[];
  limits?: { rpm: number | null; rpd: number | null; tpm: number | null; tpd: number | null };
  setup?: { keyUrl: string | null; steps: RadarLocalizedText[] } | null;
}

interface RadarReferral {
  provider: string;
  url: string;
  kind: "fixo" | "campanha";
  validUntil: string | null;
  requiredAction: string | null;
  isDefault: boolean;
}

type RadarOfferBenefit =
  | { kind: "percent_off"; basisPoints: number }
  | { kind: "credit"; amountMinor: number; currency: string }
  | { kind: "trial_days"; days: number };

interface RadarOffer {
  id: string;
  provider: string;
  title: { en: string; pt?: string };
  description: { en: string; pt?: string };
  benefit: RadarOfferBenefit;
  publicBenefit: RadarOfferBenefit | null;
  conditions: { en: string; pt?: string };
  validUntil: string | null;
  url: string;
  partner: boolean;
}

interface RadarIntelFeed {
  feed: "orbit-radar-intel";
  schemaVersion: 1;
  version: string;
  generatedAt: string;
  tier: "live";
  methodology: { kind: "elo"; initialRating: 1000; kFactor: 32 };
  rankings: Array<{
    rank: number;
    provider: string;
    modelId: string;
    category: string;
    rating: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
  catalog: {
    currentVersion: string;
    previousVersion: string | null;
    currentGeneratedAt: string;
    ageDays: number;
    freshness: "fresh" | "aging" | "stale";
    providers: { current: number; added: number; removed: number };
    models: { current: number; added: number; removed: number };
    trend: "growing" | "stable" | "shrinking";
  };
}

interface RadarCatalogResult {
  entries: MergedEntry[];
  meta: { version: string; generatedAt: string | null; tier: string; fetchedAt: string } | null;
}

interface RadarReferralsResult {
  fixed: RadarReferral[];
  campaigns: RadarReferral[];
}

interface RadarOffersResult {
  offers: RadarOffer[];
  meta: { version: string; tier: "live"; fetchedAt: string } | null;
}

interface RadarIntelResult {
  intel: RadarIntelFeed | null;
  meta: { version: string; tier: "live"; fetchedAt: string; supporterVerified: true } | null;
}

interface GetRadarCatalogDeps {
  getFlag?: (key: string) => boolean;
  getCache?: () => {
    version: string;
    generatedAt?: string | null;
    tier: string;
    payload: string;
    fetchedAt: string;
  } | null;
  baseline?: MergedEntry[];
  localOverrides?: Map<string, Partial<MergedEntry>>;
  tombstones?: Set<string>;
  getLocalState?: () => {
    localOverrides: Map<string, { displayName?: string; enabled?: boolean }>;
    tombstones: Set<string>;
  };
}

interface GetRadarReferralsDeps {
  getFlag?: (key: string) => boolean;
  getCache?: () => { generatedAt: string; tier: string; payload: string; fetchedAt: string } | null;
}

interface GetRadarOffersDeps {
  getFlag?: (key: string) => boolean;
  getCache?: () => { version: string; tier: string; payload: string; fetchedAt: string } | null;
  now?: () => Date;
}

interface GetRadarIntelDeps {
  getFlag?: (key: string) => boolean;
  getCache?: () => {
    version: string;
    tier: "live";
    payload: string;
    signature: string;
    supporterIdentity: string;
    fetchedAt: string;
  } | null;
}

export function getRadarCatalog(deps?: GetRadarCatalogDeps): RadarCatalogResult;
export function getRadarIntel(deps?: GetRadarIntelDeps): RadarIntelResult;
export function getRadarOffers(deps?: GetRadarOffersDeps): RadarOffersResult;
export function getRadarReferrals(deps?: GetRadarReferralsDeps): RadarReferralsResult;

/** Injectable deps for getCatalogWithoutOverlay. */
export interface GetCatalogWithoutOverlayDeps {
  baseline?: MergedEntry[];
  getLocalState?: () => {
    localOverrides: Map<string, { displayName?: string; enabled?: boolean }>;
    tombstones: Set<string>;
  };
}

/** The shipped baseline seen through the operator's own local Radar state (#12215). */
export function getCatalogWithoutOverlay(deps?: GetCatalogWithoutOverlayDeps): MergedEntry[];
