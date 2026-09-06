type HeaderSource = Headers | Record<string, unknown> | null | undefined;

export function applyPeerTraceHeader(
  outgoingHeaders: Record<string, string>,
  clientHeaders: HeaderSource,
  targetUrl: string,
  env?: {
    SHIGUANG_GATEWAY_INSTANCE_ID?: string;
    SHIGUANG_GATEWAY_PEER_URLS?: string;
    SHIGUANG_GATEWAY_PEER_MAX_HOPS?: string;
  },
): boolean;
