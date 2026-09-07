/** Derive the live WebSocket path from an operator-declared public URL. */
export function deriveLiveWsPath(publicUrl?: string): string {
  if (!publicUrl) return "/live-ws";
  if (!publicUrl.startsWith("ws://") && !publicUrl.startsWith("wss://")) return "/live-ws";
  try {
    const parsed = new URL(publicUrl);
    const pathname = parsed.pathname;
    return pathname && pathname !== "/" ? pathname : "/live-ws";
  } catch {
    return "/live-ws";
  }
}

/** Resolve the operator-declared public WebSocket URL at request time. */
export function resolveLiveWsPublicUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [env.LIVE_WS_PUBLIC_URL, env.NEXT_PUBLIC_LIVE_WS_PUBLIC_URL];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) return trimmed;
  }
  return null;
}

/** Read the environment at call time and derive the live WebSocket path. */
export function getLiveWsPath(): string {
  return deriveLiveWsPath(resolveLiveWsPublicUrl() ?? undefined);
}

/** Return a valid WebSocket port, or null when the input is unusable. */
export function sanitizeLiveWsPort(port: unknown): number | null {
  const value = typeof port === "string" ? Number(port) : port;
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value > 0 && value < 65536 ? value : null;
}

export interface LiveWsUrlParts {
  explicit?: string | null;
  handshakeUrl?: string | null;
  handshakePort?: number | null;
  handshakePath?: string | null;
  defaultUrl: string;
}

/**
 * Resolve the dashboard WebSocket URL. Explicit and handshake URLs take
 * precedence; otherwise valid handshake port/path values amend the default.
 */
export function resolveLiveWsUrl({
  explicit,
  handshakeUrl,
  handshakePort,
  handshakePath,
  defaultUrl,
}: LiveWsUrlParts): string {
  if (explicit) return explicit;
  if (handshakeUrl) return handshakeUrl;

  const port = sanitizeLiveWsPort(handshakePort);
  const path =
    typeof handshakePath === "string" && handshakePath.startsWith("/") ? handshakePath : null;
  if (port === null && path === null) return defaultUrl;

  try {
    const url = new URL(defaultUrl);
    if (port !== null) url.port = String(port);
    if (path !== null) url.pathname = path;
    return url.toString();
  } catch {
    return defaultUrl;
  }
}
