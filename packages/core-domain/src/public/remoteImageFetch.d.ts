export interface RemoteImageFetchResult {
  buffer: Buffer<ArrayBufferLike>;
  contentType: string;
  url: string;
}
export function fetchRemoteImage(
  input: string | URL,
  options?: Record<string, unknown>,
): Promise<RemoteImageFetchResult>;
