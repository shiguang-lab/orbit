export type VideoDrilldownVariant = "preview" | "standard" | "detail";
export const VIDEO_DRILLDOWN_VARIANTS: readonly VideoDrilldownVariant[];
export class VideoDrilldownCache {
  constructor(options: Record<string, unknown>);
}
export class VideoDrilldownLifecycle {
  constructor(options: Record<string, unknown>);
  resolve(principalId: string, handle: string, query: Record<string, unknown>): Promise<unknown | null>;
  deleteHandle(principalId: string, handle: string): boolean;
}
export function isVideoBridgeDrilldownRemoteAccessEnabled(env?: Record<string, string | undefined>): boolean;
