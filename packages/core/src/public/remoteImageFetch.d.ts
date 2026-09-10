export interface RemoteImageFetchResult {
  buffer: Buffer<ArrayBufferLike>;
  contentType: string;
  url: string;
}

export type RemoteImageLookup = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

export interface RemoteImageFetchOptions {
  enforceHttps?: boolean;
  fetchImpl?: typeof fetch;
  pinDns?: boolean;
  guard?: "none" | "public-only" | "block-metadata";
  maxBytes?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  lookup?: RemoteImageLookup;
}

export type RemoteMediaFetchOptions = RemoteImageFetchOptions;
export type RemoteMediaFetchResult = RemoteImageFetchResult;

export function fetchRemoteMedia(
  input: string | URL,
  options?: RemoteMediaFetchOptions,
): Promise<RemoteMediaFetchResult>;

export function fetchRemoteImage(
  input: string | URL,
  options?: RemoteImageFetchOptions,
): Promise<RemoteImageFetchResult>;
