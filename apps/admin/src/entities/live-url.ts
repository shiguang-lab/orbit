/** Dashboard events always use the authenticated same-origin proxy. */
export function buildDashboardLiveUrl(pageUrl: string): string {
  const url = new URL("/live-ws", pageUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
