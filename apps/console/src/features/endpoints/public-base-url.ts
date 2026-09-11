/** Public endpoint cards use domain URLs, never host, LAN or Tailnet IPs. */
export function normalizePublicBaseUrl(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return "";
    if (!host.includes(".") || host.includes(":") || /^[\d.]+$/.test(host)
      || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return "";
    const path = url.pathname.replace(/\/+$/, "");
    url.pathname = path.endsWith("/v1") ? path : `${path}/v1`;
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}

export function resolvePublicBaseUrl({ customUrl, currentOrigin, tunnelUrls = [] }: {
  customUrl?: string; currentOrigin?: string; tunnelUrls?: (string | null | undefined)[];
}): string {
  const custom = normalizePublicBaseUrl(customUrl);
  if (custom) return custom;
  const current = normalizePublicBaseUrl(currentOrigin);
  // A Tailnet browser address alone does not establish public Funnel access.
  if (current && !/\.(ts\.net|tailscale\.net)$/.test(new URL(current).hostname)) return current;
  return tunnelUrls.map(normalizePublicBaseUrl).find(Boolean) || "";
}
