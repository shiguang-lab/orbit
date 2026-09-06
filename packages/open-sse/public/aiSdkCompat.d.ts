export type StreamDefaultMode = "legacy" | "json";
export interface ResolveStreamFlagOptions {
  userAgent?: unknown;
  streamDefaultMode?: unknown;
  providerRequiresStreaming?: boolean;
}
export function resolveStreamFlag(
  bodyStream: unknown,
  acceptHeader: unknown,
  sourceFormat?: string,
  optionsOrUserAgent?: unknown,
): boolean;
