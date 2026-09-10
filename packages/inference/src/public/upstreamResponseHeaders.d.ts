export const STRIP_UPSTREAM_HEADER_NAMES: ReadonlySet<string>;
export const SENSITIVE_RESPONSE_HEADER_NAMES: ReadonlyArray<string>;
export function stripStaleEncodingHeaders(input: Headers): Headers;
export function filterUpstreamResponseHeaderEntries(
  entries: Iterable<[string, string]>,
  extraToStrip?: ReadonlyArray<string>
): Array<[string, string]>;
export function stripSensitiveResponseHeaders(input: Headers): Headers;
