export interface VideoDrilldownFrameInput {
  dataUri: string;
  timestampSeconds: number;
}

export interface VideoDrilldownFrame extends VideoDrilldownFrameInput {
  height: number;
  width: number;
}

export interface VideoDrilldownDerivationInput {
  parentContentHash: string;
  policy: string;
  version: string;
}

export interface VideoDrilldownDerivationMetadata {
  contentHash: string;
  createdAt: number;
  format: "image/jpeg";
  parent: {
    contentHash: string;
    referenceHash: string;
  };
  policy: string;
  resolution: {
    height: number;
    width: number;
  };
  version: string;
}

export interface VideoDrilldownPutValue {
  derivation: VideoDrilldownDerivationInput;
  durationSeconds: number;
  frames: readonly VideoDrilldownFrameInput[];
}

export interface VideoDrilldownResult {
  derivation: VideoDrilldownDerivationMetadata;
  durationSeconds: number;
  focusWindow?: {
    endSeconds: number;
    startSeconds: number;
  };
  frames: VideoDrilldownFrame[];
}

export type VideoDrilldownJpegNormalizer = (
  data: Buffer
) => Promise<{ data: Buffer; height: number; width: number }>;

export interface VideoDrilldownCacheOptions {
  maxEntries: number;
  maxEntriesPerPrincipal?: number;
  maxBytesPerPrincipal?: number;
  maxTotalBytes?: number;
  now?: () => number;
  ttlMs: number;
  normalizeJpeg?: VideoDrilldownJpegNormalizer;
}

export class VideoDrilldownValidationError extends Error {
  constructor(message: string);
}

export class VideoDrilldownAbortedError extends Error {
  constructor();
}

export const VIDEO_DRILLDOWN_MAX_FRAME_BYTES: number;
export const VIDEO_DRILLDOWN_MAX_ENTRY_BYTES: number;
export const VIDEO_DRILLDOWN_MAX_FRAME_DATA_URI_CHARS: number;

export class VideoDrilldownCache {
  constructor(options: VideoDrilldownCacheOptions);
  put(
    principalId: string,
    sessionId: string,
    videoRef: string,
    value: VideoDrilldownPutValue,
    requestOptions?: { signal?: AbortSignal }
  ): Promise<void>;
  get(
    principalId: string,
    sessionId: string,
    videoRef: string,
    options?: { endSeconds?: number; frameCount?: number; startSeconds?: number }
  ): VideoDrilldownResult | null;
  clearSession(principalId: string, sessionId: string): number;
  getUsage(principalId: string): VideoDrilldownUsage;
  clearAll(): void;
}

export type VideoDrilldownVariant = "preview" | "standard" | "detail";

export const VIDEO_DRILLDOWN_VARIANTS: readonly VideoDrilldownVariant[];

export interface VideoDrilldownVariantPreset {
  maxDimension: number;
  defaultPageFrames: number;
}

export const VIDEO_DRILLDOWN_VARIANT_PRESETS: Record<
  VideoDrilldownVariant,
  VideoDrilldownVariantPreset
>;
export const VIDEO_DRILLDOWN_MAX_PAGE_FRAMES: 8;
export const VIDEO_DRILLDOWN_MAX_PAGE_BYTES: number;

export function isVideoBridgeDrilldownProductionEnabled(
  env?: Record<string, string | undefined>
): boolean;
export function isVideoBridgeDrilldownRemoteAccessEnabled(
  env?: Record<string, string | undefined>
): boolean;

export interface VideoDrilldownProducePayload {
  derivation: VideoDrilldownPutValue["derivation"];
  durationSeconds: number;
  frames: readonly VideoDrilldownPutValue["frames"][number][];
}

export interface VideoDrilldownProduceOptions {
  signal?: AbortSignal;
}

export interface VideoDrilldownProduceResult {
  expiresAt: number;
  handle: string;
}

export interface VideoDrilldownResolveQuery {
  endSeconds?: number;
  frameCount?: number;
  maxPageBytes?: number;
  page?: number;
  startSeconds?: number;
  variant?: VideoDrilldownVariant;
}

export interface VideoDrilldownPage {
  derivation: VideoDrilldownResult["derivation"];
  durationSeconds: number;
  focusWindow?: VideoDrilldownResult["focusWindow"];
  frames: VideoDrilldownFrame[];
  hasMore: boolean;
  page: number;
  variant: VideoDrilldownVariant;
}

export interface VideoDrilldownUsage {
  bytes: number;
  entries: number;
  totalBytes: number;
  totalEntries: number;
}

export interface VideoDrilldownLifecycleOptions {
  cache: VideoDrilldownCache;
  maxHandles?: number;
  maxHandlesPerPrincipal?: number;
  now?: () => number;
  ttlMs?: number;
}

export class VideoDrilldownLifecycle {
  constructor(options: VideoDrilldownLifecycleOptions);
  produce(
    principalId: string,
    value: VideoDrilldownProducePayload,
    options?: VideoDrilldownProduceOptions
  ): Promise<VideoDrilldownProduceResult>;
  resolve(
    principalId: string,
    handle: string,
    query: VideoDrilldownResolveQuery
  ): Promise<VideoDrilldownPage | null>;
  deleteHandle(principalId: string, handle: string): number;
  cleanup(): number;
  getUsage(principalId: string): VideoDrilldownUsage;
  clearAll(): void;
}

export const VIDEO_BRIDGE_DRILLDOWN_PATH = "/api/modality-bridge/video/drilldown";
export function resolveVideoBridgeDrilldownPrincipal(request: Request): string | null;
